export interface DatasetMeta {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  rowCount: number;
  columnCount: number;
  parsedAt: Date;
}

export interface DatasetPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export type UploadStatus =
  | "idle"
  | "dragging"
  | "validating"
  | "parsed"
  | "analyzing"
  | "error";

export interface UploadError {
  message: string;
  details?: string;
}
