import { DatasetPreviewData, DatasetMeta } from "../types";

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function parseCsvText(
  text: string,
  fileName: string,
  fileSize: number,
  maxPreviewRows = 12
): { meta: DatasetMeta; preview: DatasetPreviewData } {
  const lines = text
    .split(/\r\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("The selected CSV file appears to be empty.");
  }

  // Parse CSV line respecting quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  if (headers.length === 0) {
    throw new Error("Unable to detect valid column headers in CSV.");
  }

  const rawRows = lines.slice(1);
  const totalRows = rawRows.length;
  const previewRows = rawRows.slice(0, maxPreviewRows).map((l) => parseLine(l));

  const meta: DatasetMeta = {
    fileName,
    fileSize,
    formattedSize: formatBytes(fileSize),
    rowCount: totalRows,
    columnCount: headers.length,
    parsedAt: new Date(),
  };

  const preview: DatasetPreviewData = {
    headers,
    rows: previewRows,
    totalRows,
  };

  return { meta, preview };
}

export function generateSampleDataset(): {
  meta: DatasetMeta;
  preview: DatasetPreviewData;
} {
  const headers = [
    "Timestamp",
    "Source IP",
    "Source Port",
    "Destination IP",
    "Destination Port",
    "Tunnel Protocol",
    "Cipher Suite",
    "Packet Length",
    "Handshake State",
    "Entropy Score",
    "Threat Signal",
  ];

  const sampleRows: string[][] = [
    [
      "2026-09-16 21:42:01",
      "192.168.1.104",
      "54210",
      "10.0.4.15",
      "51820",
      "WireGuard",
      "ChaCha20-Poly1305",
      "1420",
      "Established",
      "7.94",
      "Normal",
    ],
    [
      "2026-09-16 21:42:02",
      "192.168.1.104",
      "54212",
      "10.0.4.15",
      "51820",
      "WireGuard",
      "ChaCha20-Poly1305",
      "890",
      "Keepalive",
      "7.82",
      "Normal",
    ],
    [
      "2026-09-16 21:42:04",
      "172.16.20.55",
      "49811",
      "10.0.12.8",
      "443",
      "TLSv1.3",
      "AES-256-GCM-SHA384",
      "1500",
      "Encrypted Data",
      "7.99",
      "Normal",
    ],
    [
      "2026-09-16 21:42:05",
      "172.16.20.55",
      "49812",
      "10.0.12.8",
      "443",
      "TLSv1.3",
      "AES-256-GCM-SHA384",
      "512",
      "Session Resumed",
      "7.88",
      "Normal",
    ],
    [
      "2026-09-16 21:42:08",
      "192.168.10.88",
      "60104",
      "198.51.100.22",
      "1194",
      "OpenVPN",
      "AES-128-CBC-SHA1",
      "1380",
      "Data Channel",
      "7.65",
      "Weak Cipher",
    ],
    [
      "2026-09-16 21:42:11",
      "10.240.0.12",
      "500",
      "203.0.113.84",
      "500",
      "IPsec / IKEv2",
      "AES-256-GCM-PRF-HMAC",
      "1120",
      "Rekeying",
      "7.92",
      "Normal",
    ],
    [
      "2026-09-16 21:42:14",
      "192.168.1.104",
      "54214",
      "10.0.4.15",
      "51820",
      "WireGuard",
      "ChaCha20-Poly1305",
      "1420",
      "Established",
      "7.95",
      "Normal",
    ],
    [
      "2026-09-16 21:42:18",
      "172.16.20.92",
      "51002",
      "10.0.12.8",
      "8443",
      "QUIC / HTTP3",
      "TLS_AES_128_GCM_SHA256",
      "1280",
      "0-RTT Stream",
      "7.89",
      "Normal",
    ],
  ];

  return {
    meta: {
      fileName: "tunnel_traffic_sample.csv",
      fileSize: 4528190,
      formattedSize: "4.3 MB",
      rowCount: 8642,
      columnCount: headers.length,
      parsedAt: new Date(),
    },
    preview: {
      headers,
      rows: sampleRows,
      totalRows: 8642,
    },
  };
}
