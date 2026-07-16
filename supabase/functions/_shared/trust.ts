/**
 * Close Eye — Engineering Constitution §2, edge mirror.
 *
 *   Infrastructure failures fail OPEN. Trust failures fail SAFE.
 *
 * Canonical version: closeeye-next/lib/platform/trust.ts — KEEP IN SYNC. (The Next app
 * and Deno edge functions run in different runtimes, so this is a deliberate small
 * duplication, not shared code.)
 */
export type FailMode = "open" | "safe";
export type FailureClass =
  | "infrastructure"
  | "identity"
  | "permission"
  | "memory"
  | "safety"
  | "trust";

/** Only infrastructure fails open; everything trust-related fails safe. */
export function failMode(cls: FailureClass): FailMode {
  return cls === "infrastructure" ? "open" : "safe";
}
