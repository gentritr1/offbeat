"use client";
import { useEffect, useRef } from "react";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  execute: (input: unknown) => unknown;
};
type Context = {
  registerTool: (
    tool: Tool & {
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useWebTool(tool: Tool) {
  const latest = useRef(tool);
  latest.current = tool;
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            ...latest.current,
            execute: (input) => latest.current.execute(input),
            annotations: { readOnlyHint: false, untrustedContentHint: false },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Unsupported experimental API must not affect the interface. */
    }
    return () => lifecycle.abort();
  }, [tool.name]);
}
export function stringArgument(input: unknown, key: string): string {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected a JSON object.");
  const record = input as Record<string, unknown>;
  if (
    typeof record[key] !== "string" ||
    Object.keys(record).some((k) => k !== key)
  )
    throw new Error(`Expected only a ${key} string.`);
  return record[key] as string;
}
