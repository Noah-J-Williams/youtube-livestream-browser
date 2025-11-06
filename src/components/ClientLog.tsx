"use client";

import { useEffect, useMemo, useRef } from "react";

type ClientLogLevel = "log" | "info" | "warn" | "error" | "debug";

type ClientLogProps = {
  label: string;
  data?: unknown;
  level?: ClientLogLevel;
};

export function ClientLog({ label, data, level = "log" }: ClientLogProps) {
  const lastSnapshot = useRef<string | undefined>();

  const snapshot = useMemo(() => {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.warn("[ClientLog] Failed to serialise data for change detection", error);
      return undefined;
    }
  }, [data]);

  useEffect(() => {
    if (lastSnapshot.current === snapshot) {
      return;
    }

    lastSnapshot.current = snapshot;
    const method = typeof console[level] === "function" ? console[level] : console.log;
    method(`%c${label}`, "color:#34d399;font-weight:600;", data);
  }, [label, level, data, snapshot]);

  return null;
}
