import { AssessmentResult } from "../types";
import { DatasetMeta } from "@/features/home/types";

// Deterministic seed generator from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateDemoAssessment(
  meta: DatasetMeta,
  sampleHeaders: string[] = []
): AssessmentResult {
  const seed = hashString(`${meta.fileName}_${meta.rowCount}_${meta.columnCount}`);

  // Deterministic pseudo-random helper bounded in [min, max]
  const pseudoRange = (offset: number, min: number, max: number): number => {
    const val = (seed * 9301 + 49297 + offset * 233280) % 233280;
    const norm = val / 233280;
    return Math.floor(min + norm * (max - min + 1));
  };

  const hasWireGuard = meta.fileName.toLowerCase().includes("wireguard") ||
    sampleHeaders.some((h) => h.toLowerCase().includes("wireguard"));
  const hasOpenVPN = meta.fileName.toLowerCase().includes("openvpn");

  const tunnelType = hasWireGuard ? "WireGuard v1" : hasOpenVPN ? "OpenVPN 2.6" : "IPsec / IKEv2";
  const transportProtocol = hasWireGuard ? "UDP (Port 51820)" : hasOpenVPN ? "UDP (Port 1194)" : "ESP Transport / UDP 500";
  const cipherSuite = hasWireGuard ? "ChaCha20-Poly1305" : "AES-256-GCM-SHA384";
  const keyExchangeMethod = hasWireGuard ? "Curve25519 ECDH" : "ECDHE-X25519 (Group 19)";

  const overallScore = pseudoRange(1, 84, 91);
  const encryptionScore = pseudoRange(2, 92, 98);
  const keyExchangeScore = pseudoRange(3, 85, 93);
  const tunnelScore = pseudoRange(4, 88, 95);
  const quantumScore = pseudoRange(5, 68, 76);
  const cyberScore = pseudoRange(6, 82, 89);

  const trafficSeries = Array.from({ length: 14 }, (_, i) => {
    const minSec = i * 5;
    const timeLabel = `+${minSec}s`;
    const packets = pseudoRange(10 + i, 380, 1420);
    const throughputKbps = Math.round(packets * 1.15);
    const entropy = Number((7.82 + (pseudoRange(20 + i, 0, 16) / 100)).toFixed(2));
    return {
      time: timeLabel,
      packets,
      throughputKbps,
      entropy,
    };
  });

  return {
    datasetName: meta.fileName,
    rowCount: meta.rowCount,
    columnCount: meta.columnCount,
    analyzedAt: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    isDemo: true,
    overallScore,
    postureLabel: overallScore >= 85 ? "Good posture" : "Moderate posture",
    summaryText:
      "Detected configuration indicators show a generally strong security posture with several areas for improvement in key exchange policy and quantum readiness.",
    breakdown: {
      encryption: {
        name: "Encryption Strength",
        score: encryptionScore,
        status: encryptionScore >= 90 ? "Strong" : "Moderate",
        details: `${cipherSuite} authenticated encryption`,
      },
      keyExchange: {
        name: "Key Exchange",
        score: keyExchangeScore,
        status: keyExchangeScore >= 85 ? "Strong" : "Moderate",
        details: `${keyExchangeMethod} with PFS`,
      },
      tunnelSecurity: {
        name: "Tunnel Security",
        score: tunnelScore,
        status: "Secure",
        details: `${tunnelType} encapsulation integrity verified`,
      },
      protocolSecurity: {
        name: "Protocol Security",
        score: pseudoRange(7, 86, 92),
        status: "Strong",
        details: "Zero unencrypted fallback routes observed",
      },
      quantumReadiness: {
        name: "Quantum Readiness",
        score: quantumScore,
        status: "Needs attention",
        details: "Classical elliptic-curve; post-quantum hybrid recommended",
      },
      cyberResilience: {
        name: "Cyber Resilience",
        score: cyberScore,
        status: "Strong",
        details: "Packet sequence entropy maintains high defense barrier",
      },
    },
    tunnelSpecs: {
      tunnelType,
      transportProtocol,
      cipherSuite,
      keyExchangeMethod,
      pfsEnabled: true,
      authDigest: "SHA-384 HMAC",
      mtuSize: 1420,
    },
    cyberDimensions: [
      {
        name: "Network Exposure",
        score: pseudoRange(8, 87, 94),
        description: "Surface area restricted to negotiated endpoints",
      },
      {
        name: "Cryptographic Strength",
        score: encryptionScore,
        description: "256-bit modern AEAD symmetric ciphers",
      },
      {
        name: "Configuration Resilience",
        score: pseudoRange(9, 79, 86),
        description: "Rekey intervals and handshake timers alignment",
      },
      {
        name: "Traffic Security",
        score: pseudoRange(10, 88, 93),
        description: "Payload padding and anti-replay protection",
      },
      {
        name: "Protocol Hardening",
        score: pseudoRange(11, 83, 89),
        description: "Strict cipher negotiation without downgrade vectors",
      },
    ],
    secondaryMetrics: [
      { name: "Traffic Integrity", score: pseudoRange(12, 94, 98), status: "Optimal" },
      { name: "Protocol Hygiene", score: pseudoRange(13, 82, 88), status: "Good" },
      { name: "Authentication", score: pseudoRange(14, 90, 95), status: "Strong" },
      { name: "Rekey Frequency", score: pseudoRange(15, 76, 83), status: "Moderate" },
    ],
    recommendations: [
      {
        id: "REC-01",
        title: "Review legacy cipher negotiation rules",
        priority: "Medium",
        description:
          "Consider disabling legacy CBC fallback ciphers on edge concentrators to guarantee AEAD-only tunnel establishment across all endpoints.",
      },
      {
        id: "REC-02",
        title: "Strengthen key exchange policy with hybrid PQC",
        priority: "Medium",
        description:
          "Prepare for post-quantum transitions by enabling hybrid post-quantum key exchange (e.g. ML-KEM / Kyber768 + X25519) on compatible tunnel peers.",
      },
      {
        id: "REC-03",
        title: "Enforce automated tunnel rekey thresholds",
        priority: "Low",
        description:
          "Reduce data-volume and session-duration thresholds for automated Phase 2 rekeying to limit key reuse exposure during sustained high-throughput transfers.",
      },
    ],
    trafficSeries,
  };
}
