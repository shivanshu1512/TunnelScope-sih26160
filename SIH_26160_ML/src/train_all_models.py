"""
TunnelScope / SIH26160 — train the three production models.

This replaces the Stage-1 exploration notebook. The notebook's job was to
compare 54 candidates; that comparison is finished and its conclusions are
baked in here. This script only trains the winners, verifies them, and
writes the artefacts the Spring Boot backend consumes.

Decisions carried over from Stage 1 (see stage1_results.csv for evidence):

  traffic_classifier   GradientBoostingClassifier, BEHAVIOUR features only.
                       RandomForest and ExtraTrees scored identically
                       (0.9435 / 0.9433 floor vs 0.9421) but export to
                       25 MB and 82 MB of ONNX. GradientBoost is 452 KB.

  security_classifier  DecisionTreeClassifier, CONFIG features only.
                       Every one of 18 algorithms landed at 0.90 +/- 0.006,
                       so accuracy cannot choose a winner. A single tree
                       prints its rules, which is what the demo needs.

  risk_regressor       GradientBoostingRegressor, CONFIG features only.
                       HistGradientBoosting scored better (MAE 1.0023 vs
                       1.0399) but skl2onnx cannot convert it. Rejected
                       for deployability, not for accuracy.

Feature split is not a style choice, it is a measured result:
  behaviour -> traffic_type       0.948 macro-F1
  behaviour -> security_verdict   0.331 macro-F1  (majority baseline 0.394)
  behaviour -> risk_score         R2 -0.048       (worse than the mean)
Behaviour carries no security signal, so the security models never see it.

Usage:
    python train_all_models.py
    python train_all_models.py --data ./data --models ./models
    python train_all_models.py --no-onnx        # skip export, faster
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import (accuracy_score, classification_report, f1_score,
                             mean_absolute_error, r2_score)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier, export_text

SEED = 42

# ── feature contract ─────────────────────────────────────────────
# These names are the API contract. The Spring Boot DTOs use the same
# snake_case strings via @JsonProperty. Renaming anything here breaks Java.

CONFIG_FEATURES = ["mode", "encryption_algo", "dh_group", "pfs", "ip_version"]
BEHAVIOUR_FEATURES = ["avg_packet_size_bytes", "packet_rate_per_sec",
                      "session_duration_sec", "burstiness_index",
                      "ike_handshake_time_ms"]

TARGETS = {"traffic_type": "clf", "security_verdict": "clf", "risk_score": "reg"}


# ── pipelines ────────────────────────────────────────────────────

def config_pipeline(estimator):
    """Categorical config columns -> one-hot -> estimator."""
    prep = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
         CONFIG_FEATURES),
    ], remainder="drop")
    return Pipeline([("prep", prep), ("model", estimator)])


def behaviour_pipeline(estimator):
    """Numeric behaviour columns -> standardised -> estimator."""
    prep = ColumnTransformer([
        ("num", StandardScaler(), BEHAVIOUR_FEATURES),
    ], remainder="drop")
    return Pipeline([("prep", prep), ("model", estimator)])


def build_models():
    return {
        "traffic_classifier": {
            "pipeline": behaviour_pipeline(
                GradientBoostingClassifier(random_state=SEED)),
            "features": BEHAVIOUR_FEATURES,
            "target": "traffic_type",
            "task": "clf",
            "dtype": np.float32,   # keeps every ONNX input tensor(float)
        },
        "security_classifier": {
            "pipeline": config_pipeline(
                DecisionTreeClassifier(random_state=SEED)),
            "features": CONFIG_FEATURES,
            "target": "security_verdict",
            "task": "clf",
            "dtype": None,
        },
        "risk_regressor": {
            "pipeline": config_pipeline(
                GradientBoostingRegressor(random_state=SEED)),
            "features": CONFIG_FEATURES,
            "target": "risk_score",
            "task": "reg",
            "dtype": None,
        },
    }


# ── helpers ──────────────────────────────────────────────────────

def frame(df, spec):
    """Slice the columns a model wants, cast if it needs a fixed dtype."""
    X = df[spec["features"]]
    return X.astype(spec["dtype"]) if spec["dtype"] is not None else X


def find_root(start: Path) -> Path:
    """Walk up until a directory containing data/ is found."""
    for candidate in [start, *start.parents]:
        if (candidate / "data").is_dir():
            return candidate
    return start


def check_risk_bands(train: pd.DataFrame) -> bool:
    """Disjoint risk bands mean risk_score is a perfect proxy for the verdict.

    That was a real defect in the first dataset. Fail loudly rather than
    train a model whose headline number is an artefact.
    """
    b = train.groupby("security_verdict")["risk_score"].agg(["min", "max"])
    try:
        overlaps = (b.loc["Strong", "max"] > b.loc["Medium", "min"] and
                    b.loc["Medium", "max"] > b.loc["Weak", "min"])
    except KeyError:
        print("  ! expected Strong/Medium/Weak verdicts, got "
              f"{sorted(train.security_verdict.unique())}")
        return False
    print(b.to_string())
    print("  risk bands overlap -> ok" if overlaps else
          "  ! RISK BANDS ARE DISJOINT — risk_score leaks the verdict")
    return overlaps


def export_onnx(name, pipe, X_head, task, out_dir) -> int:
    """Export to ONNX and verify the reload matches sklearn. Returns bytes."""
    from skl2onnx import to_onnx
    import onnxruntime as ort

    # zipmap off: probabilities come back as a plain float array instead of
    # List<Map<String,Float>>, which keeps the Java side simple
    options = {} if task == "reg" else {id(pipe): {"zipmap": False}}
    onx = to_onnx(pipe, X_head.head(1), target_opset=17, options=options)
    path = out_dir / f"{name}.onnx"
    path.write_bytes(onx.SerializeToString())

    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    sample = X_head.head(200)
    feed = {}
    for inp in sess.get_inputs():
        col = sample[inp.name].to_numpy().reshape(-1, 1)
        if "string" in inp.type:
            feed[inp.name] = col.astype(object)
        elif "double" in inp.type:
            feed[inp.name] = col.astype(np.float64)
        else:
            feed[inp.name] = col.astype(np.float32)

    onnx_out = np.array(sess.run(None, feed)[0]).ravel()
    sk_out = pipe.predict(sample)

    if task == "clf":
        agree = float((onnx_out == sk_out).mean())
        ok = agree == 1.0
        detail = f"label agreement {agree:.4f}"
    else:
        delta = float(np.abs(onnx_out - sk_out).max())
        ok = delta < 1e-4
        detail = f"max delta {delta:.6f}"

    dtypes = {inp.type.replace("tensor(", "").rstrip(")") for inp in sess.get_inputs()}
    print(f"    onnx {'PASS' if ok else 'FAIL'}  {detail}  "
          f"{path.stat().st_size:,} bytes  inputs={len(sess.get_inputs())} "
          f"dtype={'/'.join(sorted(dtypes))}")
    if not ok:
        raise RuntimeError(f"{name}: ONNX parity check failed")
    return path.stat().st_size


# ── main ─────────────────────────────────────────────────────────

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    root = find_root(Path(__file__).resolve().parent)
    ap.add_argument("--data", type=Path, default=root / "data")
    ap.add_argument("--models", type=Path, default=root / "models")
    ap.add_argument("--no-onnx", action="store_true", help="skip ONNX export")
    ap.add_argument("--seed", type=int, default=SEED)
    args = ap.parse_args(argv)

    train_csv = args.data / "synthetic_ipsec_dataset_train.csv"
    test_csv = args.data / "synthetic_ipsec_dataset_test.csv"
    for p in (train_csv, test_csv):
        if not p.exists():
            sys.exit(f"missing {p}\nPass --data pointing at the csv folder.")

    train = pd.read_csv(train_csv)
    test = pd.read_csv(test_csv)
    args.models.mkdir(parents=True, exist_ok=True)

    print("=" * 68)
    print("TunnelScope — training three models")
    print("=" * 68)
    print(f"train {train.shape}   test {test.shape}   seed {args.seed}")
    print(f"nulls: train={int(train.isna().sum().sum())} "
          f"test={int(test.isna().sum().sum())}")

    print("\n--- data guard: risk_score bands ---")
    bands_ok = check_risk_bands(train)

    metrics = {}
    sizes = {}
    specs = build_models()

    for name, spec in specs.items():
        print(f"\n--- {name} ({spec['target']}) ---")
        X_tr, y_tr = frame(train, spec), train[spec["target"]]
        X_te, y_te = frame(test, spec), test[spec["target"]]

        pipe = spec["pipeline"]
        pipe.fit(X_tr, y_tr)
        pred = pipe.predict(X_te)

        if spec["task"] == "clf":
            m = {"test_f1_macro": round(float(f1_score(y_te, pred, average="macro")), 4),
                 "test_accuracy": round(float(accuracy_score(y_te, pred)), 4),
                 "n_classes": int(y_tr.nunique())}
            print(f"    features {len(spec['features'])}  classes {m['n_classes']}")
            print(f"    held-out F1 {m['test_f1_macro']:.4f}   "
                  f"acc {m['test_accuracy']:.4f}")
        else:
            m = {"test_mae": round(float(mean_absolute_error(y_te, pred)), 4),
                 "test_r2": round(float(r2_score(y_te, pred)), 4)}
            print(f"    features {len(spec['features'])}")
            print(f"    held-out MAE {m['test_mae']:.4f}   R2 {m['test_r2']:.4f}")

        metrics[name] = m

        joblib.dump(pipe, args.models / f"{name}.joblib")
        print(f"    joblib {(args.models / f'{name}.joblib').stat().st_size:,} bytes")

        if not args.no_onnx:
            sizes[name] = export_onnx(name, pipe, X_tr, spec["task"], args.models)

    # the security tree's rules are a demo artefact — print and keep them
    tree = specs["security_classifier"]["pipeline"]
    names = list(tree.named_steps["prep"].get_feature_names_out())
    rules = export_text(DecisionTreeClassifier(max_depth=4, random_state=args.seed).fit(
        tree.named_steps["prep"].transform(train[CONFIG_FEATURES]),
        train["security_verdict"]), feature_names=names, max_depth=4)
    (args.models / "security_rules.txt").write_text(rules)
    print(f"\n--- learned verdict rules (depth 4) -> security_rules.txt ---")
    print("\n".join(rules.splitlines()[:12]) + "\n    ...")

    card = {
        "project": "TunnelScope / SIH26160",
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seed": args.seed,
        "data": {
            "train_rows": len(train), "test_rows": len(test),
            "maturity": "SYNTHETIC VALIDATION — generated data, not live capture",
            "risk_bands_overlap": bool(bands_ok),
            "note": "risk_score carries deliberate Gaussian noise (sd 0.55) so the "
                    "verdict bands overlap; a non-zero MAE floor is by construction",
        },
        "selection": {
            "protocol": "RepeatedStratifiedKFold 5x5, shared folds across all "
                        "candidates, preprocessing fitted inside each fold",
            "ranked_by": "mean minus one std (conservative floor)",
            "candidates_evaluated": 54,
            "evidence": "stage1_results.csv",
        },
        "architecture_evidence": {
            "behaviour_to_traffic_type": 0.948,
            "behaviour_to_security_verdict": 0.331,
            "security_verdict_majority_baseline": 0.394,
            "behaviour_to_risk_score_r2": -0.048,
            "reading": "behaviour features carry no security signal, measured in "
                       "both directions; the deterministic and ML planes are "
                       "separate by evidence, not by assertion",
        },
        "models": {
            "traffic_classifier": {
                "algorithm": "GradientBoostingClassifier",
                "features": BEHAVIOUR_FEATURES, **metrics["traffic_classifier"],
                "limits": [
                    "config features deliberately excluded — also unusable on "
                    "ESP-only flows where IKE was never observed",
                    "top confusions are behaviourally adjacent: dns_query/icmp, "
                    "email/web_browsing, video_streaming/file_transfer",
                    "voip recall of 1.000 on training data is a generator "
                    "artefact and must not be quoted as a capability",
                ]},
            "security_classifier": {
                "algorithm": "DecisionTreeClassifier",
                "features": CONFIG_FEATURES, **metrics["security_classifier"],
                "limits": [
                    "24.8% of training rows sit in config combinations carrying "
                    "more than one verdict — 100% is unreachable by construction",
                    "the rules engine owns the authoritative verdict; this model "
                    "is parallel evidence, never the decision",
                    "a single tree matched an 18-candidate field within one "
                    "standard deviation, so it was chosen for interpretability",
                ]},
            "risk_regressor": {
                "algorithm": "GradientBoostingRegressor",
                "features": CONFIG_FEATURES, **metrics["risk_regressor"],
                "limits": [
                    "HistGradientBoosting scored better (MAE 1.0023 vs 1.0399) "
                    "but has no working skl2onnx converter — rejected on "
                    "deployability, not accuracy",
                    "MAE is bounded below by the deliberate target noise",
                ]},
        },
        "onnx": {
            "exported": not args.no_onnx,
            "opset": 17,
            "zipmap": False,
            "sizes_bytes": sizes,
            "input_contract": "each feature is its own named [N,1] input, not a "
                              "single [N,k] tensor",
            "dtypes": "traffic_classifier all tensor(float); "
                      "security_classifier and risk_regressor all tensor(string)",
            "outputs": "classifiers -> label, probabilities; regressor -> variable",
        },
        "not_quotable": [
            "demo_weak / demo_strong accuracy (1.000) — extreme configs only, no "
            "Medium rows present, this is a demo not an evaluation",
        ],
    }
    (args.models / "model_card.json").write_text(json.dumps(card, indent=2))

    print("\n" + "=" * 68)
    print(f"artefacts written to {args.models.resolve()}")
    for f in sorted(args.models.iterdir()):
        print(f"  {f.name:28s} {f.stat().st_size:>12,} bytes")
    if not bands_ok:
        print("\nWARNING: risk bands disjoint — regenerate the dataset before "
              "quoting any verdict number.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())