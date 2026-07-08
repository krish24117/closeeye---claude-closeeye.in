// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · Triage types
// Shared across the edge function, the Claude calls, and the templates.
// ─────────────────────────────────────────────────────────────────────────

/** The three lanes every message is sorted into. */
export type Lane = "inform" | "connect" | "escalate";

/**
 * Fixed topic taxonomy. Used for the care-intelligence layer (Flow D):
 * repeated questions in a sensitive topic flag the coordinator.
 * Keep this list closed — the scan job depends on it.
 */
export type Topic =
  | "general"
  | "medication"
  | "cardiac"
  | "bp"
  | "diabetes"
  | "breathing"
  | "memory"
  | "falls"
  | "mobility"
  | "mood"
  | "sleep"
  | "nutrition"
  | "pain"
  | "skin"
  | "infection"
  | "vision_hearing"
  | "out_of_scope";

/** Topics that the care-intelligence scan watches for clustering. */
export const SENSITIVE_TOPICS: Topic[] = [
  "memory",
  "falls",
  "mood",
  "breathing",
  "cardiac",
  "pain",
];

export interface VitalReading {
  type: string; // "bp" | "glucose" | "spo2" | ...
  value: string; // "165/102"
  unit?: string;
  takenAt: string; // ISO timestamp
}

/** Everything Ask Close Eye knows about THIS parent. This context is the moat. */
export interface CareContext {
  parentId: string;
  parentName: string;
  age?: number;
  conditions: string[]; // e.g. ["Type 2 Diabetes", "Hypertension"]
  medications: string[]; // names only — never used to give dosing advice
  recentVitals: VitalReading[];
  city?: string;
  location?: { lat: number; lng: number };
  tier: "free" | "founding" | "care"; // drives the free-question cap
}

export type ActionKind =
  | "book_consult"
  | "send_coordinator"
  | "call_ambulance"
  | "call_hospital"
  | "directions"
  | "create_summary"
  | "upgrade"
  | "note_only";

export interface SuggestedAction {
  id: string;
  label: string;
  kind: ActionKind;
  payload?: Record<string, unknown>;
}

export interface NearestHospital {
  name: string;
  phone?: string;
  mapsUrl?: string;
  distanceKm?: number;
}

export interface EscalationInfo {
  ambulanceNumber: string;
  nearestHospital?: NearestHospital;
  alertedTeam: boolean;
}

/** The structured payload the frontend / WhatsApp handler renders. */
export interface TriageResponse {
  lane: Lane;
  topic: Topic;
  message: string;
  disclaimer?: string;
  suggestedActions: SuggestedAction[];
  requiresHuman: boolean;
  escalation?: EscalationInfo;
  capReached?: boolean;
}

/** Result of the cheap classification call. */
export interface Classification {
  lane: Lane;
  topic: Topic;
  inScope: boolean;
}
