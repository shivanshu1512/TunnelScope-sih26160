"""
TunnelScope CLI — three-layer passive assessment report.

The three layers are kept visually separate on purpose, because they carry
different kinds of authority:

    OBSERVED    what is literally in the capture. Facts.
    INFERRED    what packet lengths and timing imply. Deterministic, with a
                stated confidence, and UNDETERMINED where the evidence runs out.
    ASSESSED    what the rules engine concludes, plus the risk score.

The ML layer, when models are present, is printed as a fourth, clearly
subordinate block. It is corroboration. The rules engine owns the verdict.

    python -m tunnelscope.cli data/sample_ipsec.pcap
    python -m tunnelscope.cli capture.pcap --models models/ --no-color
"""

from __future__ import annotations

import argparse
from pathlib import Path

from .engine import UNDETERMINED, assess
from .feature_extractor import BEHAVIOUR_FEATURES, CONFIG_FEATURES, extract

W = 74

SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}


class Style:
    def __init__(self, enabled: bool):
        self.on = enabled

    def _w(self, code: str, text: str) -> str:
        return f"\033[{code}m{text}\033[0m" if self.on else text

    def bold(self, t): return self._w("1", t)
    def dim(self, t): return self._w("2", t)
    def red(self, t): return self._w("31;1", t)
    def amber(self, t): return self._w("33;1", t)
    def green(self, t): return self._w("32;1", t)
    def blue(self, t): return self._w("36;1", t)

    def severity(self, sev: str) -> str:
        return {"CRITICAL": self.red, "HIGH": self.red, "MEDIUM": self.amber,
                "LOW": self.blue, "INFO": self.dim}[sev](f"{sev:<8}")


def rule(char: str = "─") -> str:
    return char * W


def header(s: Style, title: str, subtitle: str = "") -> None:
    print()
    print(s.bold("═" * W))
    print(s.bold(f" {title}"))
    if subtitle:
        print(s.dim(f" {subtitle}"))
    print(s.bold("═" * W))


def section(s: Style, tag: str, title: str) -> None:
    print()
    print(s.blue(f"{tag}  {title}"))
    print(s.dim(rule()))


def field(s: Style, label: str, value, note: str = "") -> None:
    text = str(value)
    coloured = s.dim(text) if text == UNDETERMINED else text
    line = f"  {label:<26} {coloured}"
    if note:
        line += s.dim(f"   {note}")
    print(line)


def bar(value: int, width: int = 40) -> str:
    filled = int(round(width * value / 100))
    return "█" * filled + "·" * (width - filled)


def report(path: str, models_dir: Path | None, s: Style) -> int:
    result = assess(path)
    neg = result["negotiation"]

    header(s, "TunnelScope — IPsec passive assessment",
           f"{result['capture']}   ·   {result['maturity']}")

    # ── layer 1 ──────────────────────────────────────────────────
    section(s, "[1]", "OBSERVED — what the capture contains")
    field(s, "frames", result["packets_total"])
    field(s, "ESP security associations", result["esp_flows"])
    field(s, "IKE messages", result["ike_messages"])
    if neg["observed"]:
        field(s, "encryption transform", neg["encryption_algo"],
              f"{neg['key_length_bits']}-bit" if neg["key_length_bits"] else "")
        field(s, "integrity transform", neg["integrity"])
        field(s, "key exchange", neg["dh_group"])
        field(s, "additional key exchange",
              ", ".join(neg["additional_ke"]) if neg["additional_ke"]
              else s.dim("none offered (RFC 9370 types 6-10)"))
        field(s, "handshake round-trip", f"{neg['ike_handshake_time_ms']} ms")
    else:
        field(s, "IKE negotiation", UNDETERMINED, "no IKE_SA_INIT captured")
    field(s, "mode", neg["mode"], "not derivable from a capture")
    field(s, "pfs", neg["pfs"], "not derivable from a capture")

    # ── layer 2 ──────────────────────────────────────────────────
    section(s, "[2]", "INFERRED — what packet lengths and timing imply")
    for sa in result["sas"]:
        res, rep = sa["residue"], sa["replay"]
        mode = res["mode"]
        tag = (s.dim(mode) if mode == UNDETERMINED else s.bold(mode))
        print(f"  SA {s.bold(sa['spi'])}   {sa['packets']} packets   "
              f"{sa['duration_sec']}s")
        print(f"     cipher mode          {tag}"
              + (f"   confidence {res['confidence']}"
                 if mode != UNDETERMINED else ""))
        classes = res["residue_classes"]
        spread = ", ".join(f"{k}:{v}" for k, v in classes.items())
        print(s.dim(f"     residue mod 16       {spread}"))
        print(s.dim(f"     distinct lengths     {res['distinct_lengths']}"))
        for n in res["notes"]:
            print(s.dim(f"       · {n}"))
        if rep["duplicates"] or rep["gaps"] or rep["resets"]:
            print(s.dim(f"     sequence             dup={rep['duplicates']} "
                        f"gaps={rep['gaps']} resets={rep['resets']}"))
        print()

    # ── ML layer (subordinate) ───────────────────────────────────
    if models_dir is not None:
        _ml_block(path, models_dir, s)

    # ── layer 3 ──────────────────────────────────────────────────
    section(s, "[3]", "ASSESSED — deterministic rules engine")
    findings = sorted(result["findings"], key=lambda f: SEV_ORDER[f["severity"]])
    for f in findings:
        print(f"  {s.severity(f['severity'])} {s.bold(f['id'])}  {f['title']}")
        print(s.dim(f"           {f['detail']}"))
        print(s.dim(f"           evidence: {f['evidence']}"))
        print()

    risk = result["risk"]
    colour = (s.red if risk["score"] >= 40 else
              s.amber if risk["score"] >= 20 else s.green)
    print(s.dim(rule()))
    score_text = f"{risk['score']:>3}"
    print(f"  risk score   {colour(score_text)}/100   {colour(risk['band'])}")
    print(f"  {s.dim(bar(risk['score']))}")
    print(f"  quantum      {risk['quantum_readiness']}")
    print(s.dim(f"  basis        {risk['basis']}"))
    print()
    return 0




def _ml_block(path: str, models_dir: Path, s: Style) -> None:
    """Optional ML corroboration. Never the verdict."""
    try:
        import joblib
        import numpy as np
        import pandas as pd
    except ImportError:
        return

    traffic_p = models_dir / "traffic_classifier.joblib"
    verdict_p = models_dir / "security_classifier.joblib"
    risk_p = models_dir / "risk_regressor.joblib"
    if not traffic_p.exists():
        print(s.dim(f"  (no models in {models_dir} — ML layer skipped)"))
        return

    feats = extract(path)
    section(s, "[+]", "ML CORROBORATION — parallel evidence, not the verdict")

    traffic = joblib.load(traffic_p)
    rows = [r["behaviour"] for r in feats["results"]]
    X = pd.DataFrame(rows)[BEHAVIOUR_FEATURES].astype(np.float32)
    labels = traffic.predict(X)
    confs = traffic.predict_proba(X).max(axis=1)

    for r, lbl, c in zip(feats["results"], labels, confs):
        cell = f"{str(lbl):<18}"
        print(f"  SA {r['spi']}   traffic type      {s.bold(cell)}"
              f"confidence {c:.2f}")

    cfg = feats["results"][0]["config"] if feats["results"] else None
    if cfg and feats["results"][0]["config_status"] == "READY":
        verdict = joblib.load(verdict_p)
        risk = joblib.load(risk_p)
        Xc = pd.DataFrame([cfg])[CONFIG_FEATURES]
        v = verdict.predict(Xc)[0]
        vc = verdict.predict_proba(Xc).max()
        rs = risk.predict(Xc)[0]
        cell = f"{str(v):<18}"
        print(f"  config       security verdict   {s.bold(cell)}"
              f"confidence {vc:.2f}")
        print(f"  config       risk estimate      {rs:.2f}/10")
    else:
        missing = feats["results"][0]["missing_config_features"] if feats["results"] else []
        print(f"  config       security verdict   {s.dim(UNDETERMINED)}")
        print(s.dim(f"                missing: {', '.join(missing)} — the model is "
                    "not asked to guess"))
    print()


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pcap", type=Path)
    ap.add_argument("--models", type=Path, default=Path("models"),
                    help="directory holding the .joblib models")
    ap.add_argument("--no-ml", action="store_true", help="skip the ML layer")
    ap.add_argument("--no-color", action="store_true")
    args = ap.parse_args(argv)

    if not args.pcap.exists():
        print(f"no such capture: {args.pcap}")
        return 2

    style = Style(enabled=not args.no_color)
    return report(str(args.pcap), None if args.no_ml else args.models, style)


if __name__ == "__main__":
    raise SystemExit(main())