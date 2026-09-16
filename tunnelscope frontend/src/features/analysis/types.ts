export interface SecurityBreakdownItem {
  name: string;
  score: number;
  status: "Strong" | "Moderate" | "Needs attention" | "Secure" | "Optimal";
  color?: string;
  details?: string;
}

export interface SecurityRecommendation {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  description: string;
}

export interface TrafficPoint {
  time: string;
  packets: number;
  throughputKbps: number;
  entropy: number;
}

export interface AssessmentResult {
  datasetName: string;
  rowCount: number;
  columnCount: number;
  analyzedAt: string;
  isDemo: true;
  overallScore: number;
  postureLabel: string;
  summaryText: string;

  // Primary breakdowns
  breakdown: {
    encryption: SecurityBreakdownItem;
    keyExchange: SecurityBreakdownItem;
    tunnelSecurity: SecurityBreakdownItem;
    protocolSecurity: SecurityBreakdownItem;
    quantumReadiness: SecurityBreakdownItem;
    cyberResilience: SecurityBreakdownItem;
  };

  // Tunnel Architecture specs
  tunnelSpecs: {
    tunnelType: string;
    transportProtocol: string;
    cipherSuite: string;
    keyExchangeMethod: string;
    pfsEnabled: boolean;
    authDigest: string;
    mtuSize: number;
  };

  // Cyber assessment dimensions
  cyberDimensions: Array<{
    name: string;
    score: number;
    description: string;
  }>;

  // Secondary metrics
  secondaryMetrics: Array<{
    name: string;
    score: number;
    status: string;
  }>;

  // Recommendations
  recommendations: SecurityRecommendation[];

  // Deterministic time series
  trafficSeries: TrafficPoint[];
}
