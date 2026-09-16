"""
Build a small RFC-conformant IPsec capture for testing and demos.

Nothing here is captured from a network. Byte layouts follow the RFCs so the
engine exercises the same parsing path it would on real traffic:

    RFC 7296   IKEv2 header, SA payload, proposal and transform substructures
    RFC 4303   ESP header (SPI, sequence number)
    RFC 3602   AES-CBC in ESP:  8 + IV(16) + k*16 + ICV
    RFC 4106   AES-GCM in ESP:  8 + IV(8) + 4-aligned ciphertext + ICV(16)

Inter-arrival times are drawn from a lognormal fitted to a target burstiness
B = (sigma - mu) / (sigma + mu), the Goh-Barabasi parameter. An earlier
generator emitted uniform 250 pkt/s with B = 0, which sat outside the
training distribution and caused every flow to classify as icmp. Profiles
below match the per-class statistics of the training set.

    python tools/make_sample.py                  -> data/sample_ipsec.pcap
    python tools/make_sample.py --out other.pcap
"""

from __future__ import annotations

import argparse
import math
import random
import struct
from pathlib import Path

# ── traffic profiles: (mean bytes, sd, packets/sec, burstiness) ──
PROFILES = {
    "voip":            (120, 20, 45, 0.20),
    "video_streaming": (1200, 150, 90, 0.60),
    "file_transfer":   (1400, 50, 120, 0.80),
    "web_browsing":    (400, 100, 15, 0.50),
    "dns_query":       (80, 15, 3, 0.10),
}


# ── pcap container ───────────────────────────────────────────────

def pcap_header() -> bytes:
    return struct.pack("<IHHiIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1)


def pcap_record(ts: float, frame: bytes) -> bytes:
    sec = int(ts)
    usec = int(round((ts - sec) * 1_000_000))
    return struct.pack("<IIII", sec, usec, len(frame), len(frame)) + frame


def ethernet(payload: bytes) -> bytes:
    return (b"\x02\x00\x00\x00\x00\x01" + b"\x02\x00\x00\x00\x00\x02"
            + b"\x08\x00" + payload)


def ipv4(src: str, dst: str, proto: int, payload: bytes) -> bytes:
    total = 20 + len(payload)
    hdr = struct.pack(">BBHHHBBH4s4s", 0x45, 0, total, random.randint(0, 0xFFFF),
                      0x4000, 64, proto, 0,
                      bytes(int(o) for o in src.split(".")),
                      bytes(int(o) for o in dst.split(".")))
    # checksum
    words = struct.unpack(">10H", hdr)
    csum = sum(words)
    csum = (csum & 0xFFFF) + (csum >> 16)
    csum = ~((csum & 0xFFFF) + (csum >> 16)) & 0xFFFF
    return hdr[:10] + struct.pack(">H", csum) + hdr[12:] + payload


def udp(sport: int, dport: int, payload: bytes) -> bytes:
    return struct.pack(">HHHH", sport, dport, 8 + len(payload), 0) + payload


# ── IKEv2 message construction (RFC 7296) ────────────────────────

def transform(t_type: int, t_id: int, key_bits: int | None = None,
              last: bool = False) -> bytes:
    attrs = b""
    if key_bits is not None:
        attrs = struct.pack(">HH", 0x800E, key_bits)   # AF=1, type 14
    length = 8 + len(attrs)
    return (struct.pack(">BBHBBH", 0 if last else 3, 0, length,
                        t_type, 0, t_id) + attrs)


def proposal(transforms: list[bytes], protocol_id: int = 1) -> bytes:
    body = b"".join(transforms)
    length = 8 + len(body)
    return (struct.pack(">BBHBBBB", 0, 0, length, 1, protocol_id, 0,
                        len(transforms)) + body)


def sa_payload(prop: bytes, next_payload: int = 0) -> bytes:
    length = 4 + len(prop)
    return struct.pack(">BBH", next_payload, 0, length) + prop


def ike_message(init_spi: bytes, resp_spi: bytes, exchange: int,
                flags: int, msg_id: int, payloads: bytes,
                first_payload: int) -> bytes:
    length = 28 + len(payloads)
    hdr = (init_spi + resp_spi
           + struct.pack(">BBBB", first_payload, 0x20, exchange, flags)
           + struct.pack(">II", msg_id, length))
    return hdr + payloads


def ike_sa_init(weak: bool = True) -> tuple[bytes, bytes]:
    """Return (request, response) for one IKE_SA_INIT exchange."""
    if weak:
        # 3DES + HMAC-SHA1-96 + modp1024 — deliberately poor
        tfs = [transform(1, 3), transform(2, 2), transform(3, 2),
               transform(4, 2, last=True)]
    else:
        # AES-GCM-16 256-bit + modp2048
        tfs = [transform(1, 20, key_bits=256), transform(2, 5),
               transform(4, 14, last=True)]

    body = sa_payload(proposal(tfs))
    init_spi = bytes(random.randint(0, 255) for _ in range(8))
    resp_spi = bytes(random.randint(0, 255) for _ in range(8))

    req = ike_message(init_spi, b"\x00" * 8, 34, 0x08, 0, body, 33)
    resp = ike_message(init_spi, resp_spi, 34, 0x20, 0, body, 33)
    return req, resp


# ── ESP packet construction ──────────────────────────────────────

def esp_cbc_length(target: int, icv: int = 12) -> int:
    """RFC 3602 lattice: 8 + IV(16) + k*16 + ICV -> one class mod 16."""
    base = 8 + 16 + icv
    k = max(1, round((target - base) / 16))
    return base + k * 16


def esp_aead_length(target: int, icv: int = 16) -> int:
    """RFC 4106 lattice: 8 + IV(8) + 4-aligned ciphertext + ICV."""
    base = 8 + 8 + icv
    m = max(1, round((target - base) / 4))
    return base + m * 4


def esp_packet(spi: int, seq: int, length: int) -> bytes:
    body = bytes(random.randint(0, 255) for _ in range(length - 8))
    return struct.pack(">II", spi, seq) + body


# ── timing ───────────────────────────────────────────────────────

def lognormal_sigma(burstiness: float) -> float:
    """Sigma of a lognormal whose inter-arrivals hit a target burstiness.

    B = (sd - mean) / (sd + mean),  CV = sd/mean = (1+B)/(1-B),
    and for a lognormal CV = sqrt(exp(s^2) - 1).
    """
    b = min(max(burstiness, 0.0), 0.95)
    cv = (1 + b) / (1 - b)
    return math.sqrt(math.log(1 + cv * cv))


def interarrivals(n: int, rate: float, burstiness: float) -> list[float]:
    s = lognormal_sigma(burstiness)
    raw = [random.lognormvariate(0.0, s) for _ in range(n)]
    mean = sum(raw) / len(raw)
    target_mean = 1.0 / rate
    return [g / mean * target_mean for g in raw]


# ── flow generation ──────────────────────────────────────────────

def build_flow(spi: int, profile: str, n_packets: int, mode: str,
               start: float, src: str, dst: str,
               fixed_length: int | None = None) -> list[tuple[float, bytes]]:
    mean_size, sd_size, rate, burst = PROFILES[profile]
    gaps = interarrivals(n_packets, rate, burst)

    out, ts, seq = [], start, 1
    for gap in gaps:
        if fixed_length is not None:
            length = fixed_length
        else:
            target = max(64, int(random.gauss(mean_size, sd_size)))
            length = (esp_cbc_length(target) if mode == "cbc"
                      else esp_aead_length(target))
        frame = ethernet(ipv4(src, dst, 50, esp_packet(spi, seq, length)))
        out.append((ts, frame))
        ts += gap
        seq += 1
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=Path("data/sample_ipsec.pcap"))
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args(argv)
    random.seed(args.seed)

    t0 = 1_760_000_000.0
    records: list[tuple[float, bytes]] = []

    # IKE_SA_INIT — deliberately weak negotiation (3DES + modp1024)
    req, resp = ike_sa_init(weak=True)
    records.append((t0, ethernet(ipv4("10.0.0.1", "10.0.0.2", 17,
                                      udp(500, 500, req)))))
    records.append((t0 + 0.148, ethernet(ipv4("10.0.0.2", "10.0.0.1", 17,
                                              udp(500, 500, resp)))))

    # SA 1 — CBC lattice, voip timing
    records += build_flow(0x11111111, "voip", 400, "cbc",
                          t0 + 0.4, "10.0.0.1", "10.0.0.2")

    # SA 2 — AEAD lattice, video timing
    records += build_flow(0x22222222, "video_streaming", 400, "aead",
                          t0 + 0.5, "10.0.0.2", "10.0.0.1")

    # SA 3 — one distinct length only: must come back UNDETERMINED
    records += build_flow(0x33333333, "dns_query", 22, "cbc",
                          t0 + 1.0, "10.0.0.3", "10.0.0.4",
                          fixed_length=esp_cbc_length(100))

    records.sort(key=lambda r: r[0])

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "wb") as fh:
        fh.write(pcap_header())
        for ts, frame in records:
            fh.write(pcap_record(ts, frame))

    print(f"wrote {args.out}  ({len(records)} frames, "
          f"{args.out.stat().st_size:,} bytes)")
    print("  SA 11111111  400 pkts  CBC lattice   voip timing")
    print("  SA 22222222  400 pkts  AEAD lattice  video timing")
    print("  SA 33333333   22 pkts  1 distinct length -> UNDETERMINED")
    print("  IKE_SA_INIT  3DES + HMAC-SHA1-96 + modp1024(2), no ADDKE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())