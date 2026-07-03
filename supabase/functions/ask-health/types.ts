// Ask Close Eye · Triage types
// Shared across the edge function, Claude calls, and templates.

export type Lane = "inform" | "connect" | "escalate";

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

export const SENSITIVE_TOPICS: Topic[] = [
  "memory",
  "falls",
  "mood",
  "breathing",
  "cardiac",
  "pain",
];

export interface VitalReading {
  type: string;
  value: string;
  unit?: string;
  takenAt: string;
}

export interface CareContext {
  parentId: string;
  parentName: string;
  age?: number;
  conditions: string[];
  medications: string[];
  recentVitals: VitalReading[];
  city?: string;
  location?: { lat: number; lng: number };
  tier: "free" | "founding" | "care";
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

export interface TriageResponse {
  lane: Lane;
  topic: Topic;
  track?: "health" | "service";
  message: string;
  disclaimer?: string;
  suggestedActions: SuggestedAction[];
  requiresHuman: boolean;
  escalation?: EscalationInfo;
  capReached?: boolean;
}

export interface Classification {
  lane: Lane;
  topic: Topic;
  inScope: boolean;
  kind: "health" | "service" | "other";
}
