"""
Turn a capture into model inputs.

The models do not share an input shape, so neither does this extractor:

    behaviour set (5 numeric)   -> traffic_classifier
        derived from ESP packet timing and sizes; available on any flow

    config set (5 categorical)  -> security_classifier, risk_regressor
        derived from the IKE_SA_INIT proposal; available only when the
        handshake was captured

That split is a measured result, not a preference. Behaviour features carry
no security signal — 0.331 macro-F1 against a 0.394 majority baseline — so
feeding them to the security models adds noise and nothing else.

The practical payoff is here: on an ESP-only capture the behaviour set is
still complete, so traffic classification runs, while the config set is
reported UNDETERMINED instead of being guessed.
"""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path

from .engine import (UNDETERMINED, EspFlow, collect_flows, read_pcap)

BEHAVIOUR_FEATURES = ["avg_packet_size_bytes", "packet_rate_per_sec",
                      "session_duration_sec", "burstiness_index",
                      "ike_handshake_time_ms"]

CONFIG_FEATURES = ["mode", "encryption_algo", "dh_group", "pfs", "ip_version"]


def burstiness(times: list[float]) -> float:
    """Goh-Barabasi burstiness of inter-arrival times, clipped to [0, 1].

        B = (sigma - mu) / (sigma + mu)

    0 means a perfectly regular stream, 1 means everything arrives in bursts.
    Returns 0.0 when there are too few packets to measure.
    """
    if len(times) < 3:
        return 0.0
    gaps = [b - a for a, b in zip(times, times[1:]) if b > a]
    if len(gaps) < 2:
        return 0.0
    mu = statistics.fmean(gaps)
    sd = statistics.pstdev(gaps)
    if mu + sd == 0:
        return 0.0
    return round(max(0.0, min(1.0, (sd - mu) / (sd + mu))), 3)


def behaviour_features(flow: EspFlow, handshake_ms: float | None) -> dict:
    duration = flow.duration
    rate = (flow.count / duration) if duration > 0 else 0.0
    return {
        "avg_packet_size_bytes": round(statistics.fmean(flow.lengths), 1),
        "packet_rate_per_sec": round(rate, 2),
        "session_duration_sec": round(duration, 2),
        "burstiness_index": burstiness(flow.times),
        # not a behaviour of the data stream, but it is numeric, it is
        # observable, and the traffic model was trained with it
        "ike_handshake_time_ms": (round(handshake_ms, 1)
                                  if handshake_ms is not None else 150.0),
    }


def normalise_cipher(algo: str, key_bits: int | None) -> str:
    """Map an IKE transform name onto the training-data vocabulary.

    The dataset knows: DES, 3DES, AES-128, AES-192, AES-256, AES-256-GCM.
    Anything outside that vocabulary is UNDETERMINED rather than forced onto
    the nearest label.
    """
    if algo in ("DES", "3DES"):
        return algo
    if algo == "AES-CBC":
        return f"AES-{key_bits}" if key_bits in (128, 192, 256) else UNDETERMINED
    if algo.startswith("AES-GCM") or algo.startswith("AES-CCM"):
        # the dataset only carries a 256-bit AEAD label
        return "AES-256-GCM" if key_bits in (None, 256) else UNDETERMINED
    return UNDETERMINED


def config_features(negotiation: dict, ip_version: str) -> tuple[dict, list[str]]:
    """Build the config set, and list whatever could not be observed."""
    cipher = (normalise_cipher(negotiation["encryption_algo"],
                               negotiation.get("key_length_bits"))
              if negotiation["observed"] else UNDETERMINED)

    feats = {
        # never derivable from a capture — analyst-supplied or UNDETERMINED
        "mode": UNDETERMINED,
        "encryption_algo": cipher,
        "dh_group": negotiation["dh_group"],
        "pfs": UNDETERMINED,
        "ip_version": ip_version,
    }
    missing = [k for k, v in feats.items() if v == UNDETERMINED]
    return feats, missing


def extract(path: str) -> dict:
    """Extract both feature sets for every ESP flow in a capture."""
    packets = read_pcap(path)
    flows, ike_msgs = collect_flows(packets)

    init = [m for m in ike_msgs if m["exchange"] == "IKE_SA_INIT"]
    proposals = [p for m in init for p in m["proposals"]]
    chosen = proposals[0] if proposals else None

    handshake_ms = None
    if len(init) >= 2:
        handshake_ms = (init[1]["_ts"] - init[0]["_ts"]) * 1000

    negotiation = {
        "observed": chosen is not None,
        "encryption_algo": chosen.encryption_algo if chosen else UNDETERMINED,
        "key_length_bits": chosen.key_length_bits if chosen else None,
        "dh_group": chosen.dh_group if chosen else UNDETERMINED,
    }

    ip_version = "IPv6" if any(p.src == "ipv6" for p in packets) else "IPv4"
    config, missing = config_features(negotiation, ip_version)

    results = []
    for spi, flow in flows.items():
        behaviour = behaviour_features(flow, handshake_ms)
        beh_ready = flow.count >= 3 and flow.duration > 0

        results.append({
            "spi": spi,
            "src": flow.src,
            "dst": flow.dst,
            "packets": flow.count,
            "behaviour": behaviour,
            "behaviour_status": "READY" if beh_ready else UNDETERMINED,
            "config": config,
            "config_status": "READY" if not missing else UNDETERMINED,
            "missing_config_features": missing,
        })

    return {
        "capture": path,
        "flows": len(results),
        "ike_observed": chosen is not None,
        "results": results,
        "note": ("mode and pfs are not derivable from any capture; supply them "
                 "from configuration or leave them UNDETERMINED"),
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="pcap -> model features")
    ap.add_argument("pcap", type=Path)
    ap.add_argument("--json", action="store_true", help="dump raw JSON")
    args = ap.parse_args(argv)

    out = extract(str(args.pcap))
    if args.json:
        print(json.dumps(out, indent=2))
        return 0

    print(f"{out['capture']}  —  {out['flows']} flow(s), "
          f"IKE {'observed' if out['ike_observed'] else 'not observed'}\n")
    for r in out["results"]:
        print(f"SA {r['spi']}   {r['packets']} packets")
        print(f"  behaviour [{r['behaviour_status']}]")
        for k in BEHAVIOUR_FEATURES:
            print(f"     {k:24s} {r['behaviour'][k]}")
        print(f"  config    [{r['config_status']}]")
        for k in CONFIG_FEATURES:
            print(f"     {k:24s} {r['config'][k]}")
        if r["missing_config_features"]:
            print(f"     missing: {', '.join(r['missing_config_features'])}")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())