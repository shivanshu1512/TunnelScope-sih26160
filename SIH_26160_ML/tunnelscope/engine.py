"""
TunnelScope engine — passive IPsec assessment.

Reads a packet capture, parses whatever IKEv2 left in cleartext, infers what
it can about the ESP data stream from packet lengths alone, applies a
deterministic rules engine, and scores the result.

Design rule that runs through the whole file: when the capture does not
contain enough evidence to answer a question, the answer is UNDETERMINED.
Nothing here guesses.

Stdlib only — no scapy, no libpcap.
"""

from __future__ import annotations

import struct
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any

UNDETERMINED = "UNDETERMINED"

# ── IKEv2 registries (RFC 7296 / IANA) ───────────────────────────

EXCHANGE_TYPES = {34: "IKE_SA_INIT", 35: "IKE_AUTH",
                  36: "CREATE_CHILD_SA", 37: "INFORMATIONAL"}

TRANSFORM_TYPES = {1: "ENCR", 2: "PRF", 3: "INTEG", 4: "KE", 5: "ESN",
                   # RFC 9370 additional key exchanges
                   6: "ADDKE1", 7: "ADDKE2", 8: "ADDKE3",
                   9: "ADDKE4", 10: "ADDKE5"}

ENCR_IDS = {2: "DES", 3: "3DES", 11: "NULL", 12: "AES-CBC", 13: "AES-CTR",
            18: "AES-GCM-8", 19: "AES-GCM-12", 20: "AES-GCM-16",
            23: "AES-CCM-16", 28: "ChaCha20-Poly1305"}

# AEAD ciphers carry their own integrity; CBC/CTR need a separate INTEG
AEAD_IDS = {18, 19, 20, 23, 28}

DH_GROUPS = {1: "modp768(1)", 2: "modp1024(2)", 5: "modp1536(5)",
             14: "modp2048(14)", 15: "modp3072(15)", 16: "modp4096(16)",
             17: "modp6144(17)", 18: "modp8192(18)",
             19: "ecp256(19)", 20: "ecp384(20)", 21: "ecp521(21)",
             31: "x25519(31)", 32: "x448(32)",
             # RFC 9370 / ML-KEM code points
             35: "ML-KEM-512(35)", 36: "ML-KEM-768(36)", 37: "ML-KEM-1024(37)"}

PQ_KEM_IDS = {35, 36, 37}

INTEG_IDS = {0: "NONE", 2: "HMAC-SHA1-96", 5: "AES-XCBC-96",
             12: "HMAC-SHA2-256-128", 13: "HMAC-SHA2-384-192",
             14: "HMAC-SHA2-512-256"}

# ICV length in bytes, by integrity transform
ICV_LENGTHS = {2: 12, 5: 12, 12: 16, 13: 24, 14: 32}

# Diffie-Hellman groups considered inadequate for new deployments
WEAK_DH = {1, 2, 5}
WEAK_ENCR = {2, 3, 11}


# ── pcap reading ─────────────────────────────────────────────────

@dataclass
class Packet:
    ts: float
    src: str
    dst: str
    proto: int          # IP protocol number
    sport: int | None
    dport: int | None
    payload: bytes      # transport payload (ESP header onward, or IKE message)
    wire_len: int       # full frame length as captured


def _ip_str(raw: bytes) -> str:
    return ".".join(str(b) for b in raw)


def read_pcap(path: str) -> list[Packet]:
    """Minimal classic-pcap reader. Handles Ethernet and raw-IP link types."""
    with open(path, "rb") as fh:
        blob = fh.read()

    if len(blob) < 24:
        raise ValueError(f"{path}: too short to be a pcap")

    magic = blob[:4]
    if magic == b"\xa1\xb2\xc3\xd4":
        endian, nano = ">", False
    elif magic == b"\xd4\xc3\xb2\xa1":
        endian, nano = "<", False
    elif magic == b"\xa1\xb2\x3c\x4d":
        endian, nano = ">", True
    elif magic == b"\x4d\x3c\xb2\xa1":
        endian, nano = "<", True
    elif magic == b"\x0a\x0d\x0d\x0a":
        raise ValueError(f"{path}: pcapng is not supported — "
                         "convert with `editcap -F pcap in.pcapng out.pcap`")
    else:
        raise ValueError(f"{path}: unrecognised magic {magic.hex()}")

    link_type = struct.unpack(endian + "I", blob[20:24])[0]
    packets, off = [], 24

    while off + 16 <= len(blob):
        ts_sec, ts_frac, incl, _orig = struct.unpack(endian + "IIII",
                                                     blob[off:off + 16])
        off += 16
        frame = blob[off:off + incl]
        off += incl
        ts = ts_sec + (ts_frac / 1e9 if nano else ts_frac / 1e6)

        pkt = _decode_frame(frame, link_type, ts)
        if pkt is not None:
            packets.append(pkt)

    return packets


def _decode_frame(frame: bytes, link_type: int, ts: float) -> Packet | None:
    """Ethernet/raw-IP -> IPv4/IPv6 -> transport. Returns None if not IP."""
    if link_type == 1:                      # Ethernet
        if len(frame) < 14:
            return None
        ethertype = struct.unpack(">H", frame[12:14])[0]
        if ethertype == 0x0800:
            ip = frame[14:]
        elif ethertype == 0x86DD:
            ip = frame[14:]
        else:
            return None
    elif link_type in (101, 12, 14):        # raw IP
        ip = frame
    else:
        return None

    if not ip:
        return None
    version = ip[0] >> 4

    if version == 4:
        if len(ip) < 20:
            return None
        ihl = (ip[0] & 0x0F) * 4
        total_len = struct.unpack(">H", ip[2:4])[0]
        proto = ip[9]
        src, dst = _ip_str(ip[12:16]), _ip_str(ip[16:20])
        body = ip[ihl:total_len] if total_len else ip[ihl:]
    elif version == 6:
        if len(ip) < 40:
            return None
        payload_len = struct.unpack(">H", ip[4:6])[0]
        proto = ip[6]
        src = dst = "ipv6"
        body = ip[40:40 + payload_len]
    else:
        return None

    sport = dport = None
    if proto == 17 and len(body) >= 8:      # UDP
        sport, dport = struct.unpack(">HH", body[:4])
        body = body[8:]

    return Packet(ts=ts, src=src, dst=dst, proto=proto,
                  sport=sport, dport=dport, payload=body, wire_len=len(frame))


# ── IKEv2 parsing ────────────────────────────────────────────────

@dataclass
class IkeProposal:
    protocol: str = UNDETERMINED
    encryption_algo: str = UNDETERMINED
    key_length_bits: int | None = None
    integrity: str = UNDETERMINED
    prf: str = UNDETERMINED
    dh_group: str = UNDETERMINED
    dh_group_id: int | None = None
    encr_id: int | None = None
    integ_id: int | None = None
    is_aead: bool = False
    additional_ke: list[str] = field(default_factory=list)
    additional_ke_ids: list[int] = field(default_factory=list)


def parse_ike(payload: bytes) -> dict[str, Any] | None:
    """Parse one IKEv2 message. Returns None if this is not IKEv2.

    Only IKE_SA_INIT carries proposals in cleartext. Everything after the
    handshake is encrypted, so that is all we can ever read passively.
    """
    # UDP 4500 prefixes non-ESP traffic with four zero bytes
    if len(payload) >= 4 and payload[:4] == b"\x00\x00\x00\x00":
        payload = payload[4:]

    if len(payload) < 28:
        return None

    init_spi, resp_spi = payload[:8], payload[8:16]
    next_payload, version, exch_type, flags = payload[16:20]
    msg_id, length = struct.unpack(">II", payload[20:28])

    if (version >> 4) != 2:                 # major version must be 2
        return None
    if exch_type not in EXCHANGE_TYPES:
        return None

    msg = {
        "initiator_spi": init_spi.hex(),
        "responder_spi": resp_spi.hex(),
        "exchange": EXCHANGE_TYPES[exch_type],
        "message_id": msg_id,
        "is_response": bool(flags & 0x20),
        "proposals": [],
    }

    # walk the payload chain
    off, nxt = 28, next_payload
    body = payload[:length] if length and length <= len(payload) else payload

    while nxt != 0 and off + 4 <= len(body):
        p_next, _crit, p_len = body[off], body[off + 1], \
            struct.unpack(">H", body[off + 2:off + 4])[0]
        if p_len < 4 or off + p_len > len(body):
            break
        chunk = body[off + 4:off + p_len]

        if nxt == 33:                       # SA payload
            msg["proposals"].extend(_parse_sa(chunk))

        off += p_len
        nxt = p_next

    return msg


def _parse_sa(data: bytes) -> list[IkeProposal]:
    """Walk proposal substructures inside an SA payload."""
    proposals, off = [], 0

    while off + 8 <= len(data):
        _last, _res, p_len = data[off], data[off + 1], \
            struct.unpack(">H", data[off + 2:off + 4])[0]
        if p_len < 8 or off + p_len > len(data):
            break

        protocol_id = data[off + 5]
        spi_size = data[off + 6]
        n_transforms = data[off + 7]

        prop = IkeProposal(protocol={1: "IKE", 2: "AH", 3: "ESP"}.get(
            protocol_id, f"proto{protocol_id}"))

        t_off = off + 8 + spi_size
        for _ in range(n_transforms):
            if t_off + 8 > off + p_len:
                break
            t_len = struct.unpack(">H", data[t_off + 2:t_off + 4])[0]
            if t_len < 8:
                break
            t_type = data[t_off + 4]
            t_id = struct.unpack(">H", data[t_off + 6:t_off + 8])[0]
            attrs = data[t_off + 8:t_off + t_len]

            _apply_transform(prop, t_type, t_id, attrs)
            t_off += t_len

        proposals.append(prop)
        off += p_len

    return proposals


def _apply_transform(prop: IkeProposal, t_type: int, t_id: int,
                     attrs: bytes) -> None:
    if t_type == 1:                          # encryption
        prop.encr_id = t_id
        prop.encryption_algo = ENCR_IDS.get(t_id, f"ENCR-{t_id}")
        prop.is_aead = t_id in AEAD_IDS
        # key length attribute: AF bit set, type 14, 2-byte value
        if len(attrs) >= 4:
            a_type = struct.unpack(">H", attrs[:2])[0]
            if a_type == 0x800E:
                prop.key_length_bits = struct.unpack(">H", attrs[2:4])[0]
    elif t_type == 2:
        prop.prf = f"PRF-{t_id}"
    elif t_type == 3:
        prop.integ_id = t_id
        prop.integrity = INTEG_IDS.get(t_id, f"INTEG-{t_id}")
    elif t_type == 4:
        prop.dh_group_id = t_id
        prop.dh_group = DH_GROUPS.get(t_id, f"group{t_id}")
    elif t_type in (6, 7, 8, 9, 10):         # RFC 9370 additional key exchange
        prop.additional_ke_ids.append(t_id)
        prop.additional_ke.append(DH_GROUPS.get(t_id, f"group{t_id}"))


# ── ESP grouping ─────────────────────────────────────────────────

@dataclass
class EspFlow:
    spi: str
    src: str
    dst: str
    lengths: list[int] = field(default_factory=list)
    seqs: list[int] = field(default_factory=list)
    times: list[float] = field(default_factory=list)

    @property
    def count(self) -> int:
        return len(self.lengths)

    @property
    def duration(self) -> float:
        return (self.times[-1] - self.times[0]) if len(self.times) > 1 else 0.0


def collect_flows(packets: list[Packet]) -> tuple[dict[str, EspFlow], list[dict]]:
    """Split a capture into ESP flows keyed by SPI, plus decoded IKE messages."""
    flows: dict[str, EspFlow] = {}
    ike_msgs: list[dict] = []

    for pkt in packets:
        is_esp = pkt.proto == 50
        # UDP-encapsulated ESP lives on 4500 only, and is distinguished from
        # IKE on the same port by the four-byte non-ESP marker (RFC 3948).
        is_udp_esp = (pkt.proto == 17
                      and 4500 in (pkt.dport, pkt.sport)
                      and len(pkt.payload) >= 8
                      and pkt.payload[:4] != b"\x00\x00\x00\x00")
        is_ike = pkt.proto == 17 and (500 in (pkt.dport, pkt.sport)
                                      or 4500 in (pkt.dport, pkt.sport))

        if is_esp or is_udp_esp:
            body = pkt.payload
            if len(body) < 8:
                continue
            spi, seq = struct.unpack(">II", body[:8])
            key = f"{spi:08x}"
            flow = flows.setdefault(key, EspFlow(spi=key, src=pkt.src, dst=pkt.dst))
            flow.lengths.append(len(body))
            flow.seqs.append(seq)
            flow.times.append(pkt.ts)
        elif is_ike:
            msg = parse_ike(pkt.payload)
            if msg:
                msg["_ts"] = pkt.ts
                ike_msgs.append(msg)

    return flows, ike_msgs


# ── residue analysis ─────────────────────────────────────────────

MIN_DISTINCT_LENGTHS = 8


def residue_analysis(lengths: list[int], icv_len: int | None = None) -> dict:
    """Infer cipher *mode* from ESP packet lengths alone.

    RFC 3602 (AES-CBC):  ESP = 8 + IV(16) + k*16 + ICV
        every packet lands on the SAME residue class mod 16.
    RFC 4106 (AES-GCM):  ESP = 8 + IV(8) + 4-aligned ciphertext + ICV(16)
        lengths are 4-aligned and scatter across FOUR classes mod 16.

    This identifies the MODE, never the cipher and never the key size.
    AES-128, AES-192 and AES-256 are length-identical.
    """
    result = {
        "mode": UNDETERMINED,
        "confidence": 0.0,
        "packets": len(lengths),
        "distinct_lengths": len(set(lengths)),
        "residue_classes": {},
        "dominant_class": None,
        "notes": [],
    }

    if not lengths:
        result["notes"].append("no ESP packets in this flow")
        return result

    counts = Counter(L % 16 for L in lengths)
    total = len(lengths)
    result["residue_classes"] = dict(sorted(counts.items()))

    dominant_class, dominant_n = counts.most_common(1)[0]
    result["dominant_class"] = dominant_class
    share = dominant_n / total

    if result["distinct_lengths"] < MIN_DISTINCT_LENGTHS:
        result["notes"].append(
            f"only {result['distinct_lengths']} distinct lengths "
            f"(need {MIN_DISTINCT_LENGTHS}) — lattice inconclusive")
        return result

    aligned_4 = all(L % 4 == 0 for L in lengths)

    if len(counts) == 1:
        result["mode"] = "CBC"
        result["confidence"] = round(share, 3)
        result["notes"].append(
            f"all {total} packets on residue class {dominant_class} mod 16 — "
            "block-aligned, consistent with CBC")
    elif share >= 0.95:
        result["mode"] = "CBC"
        result["confidence"] = round(share, 3)
        result["notes"].append(
            f"{dominant_n}/{total} packets on class {dominant_class} mod 16")
    elif aligned_4 and len(counts) >= 3:
        result["mode"] = "AEAD"
        result["confidence"] = round(len(counts) / 4 if len(counts) <= 4 else 1.0, 3)
        result["notes"].append(
            f"lengths 4-aligned and spread across {len(counts)} classes mod 16 — "
            "consistent with a counter-mode AEAD construction")
    else:
        result["notes"].append(
            f"length distribution matches neither lattice "
            f"({len(counts)} classes, 4-aligned={aligned_4})")

    # disclosed ambiguities — never silently resolved
    result["notes"].append("key size not derivable from length: "
                           "AES-128/192/256 are length-identical")
    if icv_len in (16, 32):
        result["notes"].append(
            f"ICV {icv_len} aliases with {32 if icv_len == 16 else 16} mod 16 — "
            "ambiguity disclosed, not resolved")

    return result


# ── replay / sequence analysis ───────────────────────────────────

def replay_analysis(seqs: list[int]) -> dict:
    """Look at ESP sequence numbers for gaps, duplicates and resets."""
    result = {"packets": len(seqs), "duplicates": 0, "gaps": 0,
              "out_of_order": 0, "resets": 0, "max_gap": 0, "notes": []}

    if len(seqs) < 2:
        result["notes"].append("too few packets for sequence analysis")
        return result

    seen = Counter(seqs)
    result["duplicates"] = sum(n - 1 for n in seen.values() if n > 1)

    prev = seqs[0]
    for cur in seqs[1:]:
        if cur < prev:
            if prev - cur > (1 << 30):
                result["resets"] += 1
            else:
                result["out_of_order"] += 1
        elif cur > prev + 1:
            result["gaps"] += 1
            result["max_gap"] = max(result["max_gap"], cur - prev - 1)
        prev = cur

    if result["duplicates"]:
        result["notes"].append(
            f"{result['duplicates']} duplicate sequence numbers — "
            "possible replay, retransmission, or a capture artefact")
    if result["resets"]:
        result["notes"].append(
            f"{result['resets']} sequence resets — rekey or counter wrap")
    if not result["notes"]:
        result["notes"].append("sequence space clean")

    return result


# ── rules engine ─────────────────────────────────────────────────

@dataclass
class Finding:
    id: str
    severity: str        # CRITICAL | HIGH | MEDIUM | LOW | INFO
    title: str
    detail: str
    evidence: str

    def as_dict(self) -> dict:
        return {"id": self.id, "severity": self.severity, "title": self.title,
                "detail": self.detail, "evidence": self.evidence}


SEVERITY_WEIGHT = {"CRITICAL": 40, "HIGH": 25, "MEDIUM": 12, "LOW": 5, "INFO": 0}


def apply_rules(prop: IkeProposal | None, residue: dict, replay: dict,
                flow: EspFlow | None) -> list[Finding]:
    """Deterministic checks. This — not the ML model — owns the verdict."""
    findings: list[Finding] = []

    if prop is None:
        findings.append(Finding(
            "IKE-000", "INFO", "No IKE handshake observed",
            "The capture contains ESP data but no IKE_SA_INIT, so negotiated "
            "parameters cannot be read. Configuration assessment is "
            f"{UNDETERMINED}.",
            "0 IKE_SA_INIT messages"))
    else:
        if prop.encr_id in WEAK_ENCR:
            sev = "CRITICAL" if prop.encr_id == 2 else "HIGH"
            findings.append(Finding(
                "ESP-001", sev, f"Deprecated cipher: {prop.encryption_algo}",
                "This cipher does not meet contemporary strength requirements "
                "and is deprecated for new deployments.",
                f"IKE transform ENCR={prop.encryption_algo}"))

        if prop.dh_group_id in WEAK_DH:
            findings.append(Finding(
                "IKE-001", "HIGH", f"Weak Diffie-Hellman group: {prop.dh_group}",
                "Groups below 2048 bits are considered inadequate against a "
                "well-resourced adversary and are precomputation targets.",
                f"IKE transform KE={prop.dh_group}"))

        if prop.integ_id == 2:
            findings.append(Finding(
                "ESP-002", "MEDIUM", "Legacy integrity algorithm",
                "HMAC-SHA1-96 is deprecated; SHA2-256 or better is expected.",
                f"IKE transform INTEG={prop.integrity}"))

        if not prop.is_aead and prop.integ_id == 0:
            findings.append(Finding(
                "ESP-003", "CRITICAL", "Encryption without integrity protection",
                "A non-AEAD cipher with no integrity transform is malleable.",
                "INTEG=NONE with a non-AEAD cipher"))

        # RFC 9370 quantum readiness
        if not prop.additional_ke_ids:
            findings.append(Finding(
                "PQC-001", "HIGH", "Classical key exchange only",
                "No RFC 9370 additional key exchange (transform types 6-10) was "
                "offered. Traffic recorded today remains decryptable once a "
                "cryptographically relevant quantum computer exists.",
                f"KE={prop.dh_group}, no ADDKE transforms present"))
        elif any(i in PQ_KEM_IDS for i in prop.additional_ke_ids):
            findings.append(Finding(
                "PQC-003", "INFO", "Hybrid post-quantum key exchange present",
                "A post-quantum KEM is negotiated alongside the classical group.",
                f"ADDKE={', '.join(prop.additional_ke)}"))

    if residue["mode"] == "CBC":
        findings.append(Finding(
            "ESP-004", "MEDIUM", "CBC-mode construction inferred",
            "Packet lengths collapse onto a single residue class mod 16, which "
            "is the CBC lattice. AEAD modes are preferred.",
            f"class {residue['dominant_class']} mod 16, "
            f"confidence {residue['confidence']}"))
    elif residue["mode"] == UNDETERMINED:
        findings.append(Finding(
            "ESP-005", "INFO", f"Cipher mode {UNDETERMINED}",
            "The flow does not carry enough length variation to resolve the "
            "lattice. Reported as unknown rather than guessed.",
            "; ".join(residue["notes"][:1])))

    if replay["duplicates"]:
        findings.append(Finding(
            "ESP-006", "MEDIUM", "Duplicate ESP sequence numbers",
            "Repeated sequence numbers may indicate replay, retransmission, or "
            "a capture artefact. Requires manual correlation.",
            f"{replay['duplicates']} duplicates in {replay['packets']} packets"))

    if flow is not None and flow.count < 20:
        findings.append(Finding(
            "CAP-001", "LOW", "Short flow",
            "Few packets observed; statistical inference is weak on this SA.",
            f"{flow.count} ESP packets"))

    return findings


def score_risk(findings: list[Finding]) -> dict:
    """Prototype rule-based risk score. Not calibrated against incident data.

    Weights combine with diminishing returns rather than by addition:

        score = 100 * (1 - product(1 - w/100))

    A plain sum saturates at 100 after three or four findings, which makes a
    merely poor configuration indistinguishable from a catastrophic one. This
    form keeps the ordering meaningful and can never exceed 100.
    """
    residual = 1.0
    for f in findings:
        residual *= 1 - SEVERITY_WEIGHT[f.severity] / 100
    score = int(round(100 * (1 - residual)))
    raw = sum(SEVERITY_WEIGHT[f.severity] for f in findings)
    band = ("CRITICAL" if score >= 75 else
            "HIGH RISK" if score >= 40 else
            "MODERATE" if score >= 20 else "LOW RISK")

    pq = [f for f in findings if f.id.startswith("PQC")]
    quantum = (UNDETERMINED if not pq else
               "QUANTUM READY" if any(f.id == "PQC-003" for f in pq) else
               "HARVEST-NOW-DECRYPT-LATER EXPOSURE")

    return {"score": score, "band": band, "raw": raw,
            "quantum_readiness": quantum,
            "basis": "rule weights, prototype — not calibrated"}


# ── orchestration ────────────────────────────────────────────────

def assess(path: str) -> dict:
    """Full passive assessment of one capture."""
    packets = read_pcap(path)
    flows, ike_msgs = collect_flows(packets)

    init = [m for m in ike_msgs if m["exchange"] == "IKE_SA_INIT"]
    proposals = [p for m in init for p in m["proposals"]]
    chosen = proposals[0] if proposals else None

    icv = ICV_LENGTHS.get(chosen.integ_id) if chosen else None

    handshake_ms = None
    if len(init) >= 2:
        handshake_ms = round((init[1]["_ts"] - init[0]["_ts"]) * 1000, 1)

    sa_reports = []
    all_findings: list[Finding] = []

    for spi, flow in flows.items():
        residue = residue_analysis(flow.lengths, icv_len=icv)
        replay = replay_analysis(flow.seqs)
        findings = apply_rules(chosen, residue, replay, flow)
        all_findings.extend(findings)
        sa_reports.append({
            "spi": spi, "src": flow.src, "dst": flow.dst,
            "packets": flow.count,
            "duration_sec": round(flow.duration, 3),
            "residue": residue, "replay": replay,
            "findings": [f.as_dict() for f in findings],
        })

    # de-duplicate findings that are properties of the negotiation, not the SA
    unique: dict[str, Finding] = {}
    for f in all_findings:
        unique.setdefault(f.id, f)
    findings = list(unique.values())

    return {
        "capture": path,
        "packets_total": len(packets),
        "esp_flows": len(flows),
        "ike_messages": len(ike_msgs),
        "negotiation": {
            "observed": chosen is not None,
            "encryption_algo": chosen.encryption_algo if chosen else UNDETERMINED,
            "key_length_bits": (chosen.key_length_bits if chosen else None),
            "integrity": chosen.integrity if chosen else UNDETERMINED,
            "dh_group": chosen.dh_group if chosen else UNDETERMINED,
            "additional_ke": chosen.additional_ke if chosen else [],
            "is_aead": chosen.is_aead if chosen else None,
            "ike_handshake_time_ms": handshake_ms,
            # neither of these is derivable from a capture, ever
            "mode": UNDETERMINED,
            "pfs": UNDETERMINED,
        },
        "sas": sa_reports,
        "findings": [f.as_dict() for f in findings],
        "risk": score_risk(findings),
        "maturity": "PROTOTYPE — deterministic parse, no calibration",
    }