"use client";

import { useState, useCallback } from "react";
import { DatasetMeta, DatasetPreviewData, UploadStatus, UploadError } from "../types";
import { parseCsvText, generateSampleDataset } from "../utils/csv-parser";

export function useCsvUpload() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [preview, setPreview] = useState<DatasetPreviewData | null>(null);
  const [error, setError] = useState<UploadError | null>(null);

  const processFile = useCallback((file: File) => {
    // Validate file type
    const isCsv =
      file.name.toLowerCase().endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/vnd.ms-excel" ||
      file.type === "text/plain";

    if (!isCsv) {
      setError({
        message: "Invalid file format",
        details: "Please upload a valid CSV (.csv) network traffic dataset.",
      });
      setStatus("error");
      return;
    }

    if (file.size === 0) {
      setError({
        message: "Empty file",
        details: "The selected CSV file has a size of 0 bytes.",
      });
      setStatus("error");
      return;
    }

    setStatus("validating");
    setError(null);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = parseCsvText(content, file.name, file.size);
        setMeta(result.meta);
        setPreview(result.preview);
        setStatus("parsed");
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to parse CSV file.";
        setError({
          message: "Parsing Error",
          details: errorMsg,
        });
        setStatus("error");
      }
    };

    reader.onerror = () => {
      setError({
        message: "File read failure",
        details: "Unable to read the selected file from disk.",
      });
      setStatus("error");
    };

    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus((prev) => (prev === "parsed" ? prev : "dragging"));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus((prev) => (prev === "dragging" ? "idle" : prev));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      } else {
        setStatus("idle");
      }
    },
    [processFile]
  );

  const handleLoadSample = useCallback(() => {
    setStatus("validating");
    setError(null);
    setTimeout(() => {
      const sample = generateSampleDataset();
      setMeta(sample.meta);
      setPreview(sample.preview);
      setStatus("parsed");
    }, 250);
  }, []);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setMeta(null);
    setPreview(null);
    setError(null);
  }, []);

  return {
    status,
    setStatus,
    meta,
    preview,
    error,
    processFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleLoadSample,
    handleReset,
  };
}
