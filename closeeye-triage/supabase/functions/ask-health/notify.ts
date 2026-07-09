// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · Escalation helpers
//
//  - findNearestHospital(): uses Google Places (you already have a Maps key).
//  - notifyCareTeam(): sends a WhatsApp alert to the coordinator + Aishwarya
//    via the Meta WhatsApp Cloud API (sender +91 9121577395).
//
// Both fail soft: an escalation must NEVER be blocked by a notification error.
// The family still gets the emergency message and the ambulance number.
// ─────────────────────────────────────────────────────────────────────────

import type { CareContext, NearestHospital } from "./types.ts";

const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_CLOUD_TOKEN");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"); // Meta phone-number id for +91 9121577395
const CARE_TEAM_NUMBERS = (Deno.env.get("CARE_TEAM_WHATSAPP") ?? "") // comma-separated E.164, e.g. 919000221261
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Find the nearest hospital to the parent's saved location. Returns undefined on any failure. */
export async function findNearestHospital(ctx: CareContext): Promise<NearestHospital | undefined> {
  if (!ctx.location || !GOOGLE_MAPS_KEY) return undefined;
  const { lat, lng } = ctx.location;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}&rankby=distance&type=hospital&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    const top = data?.results?.[0];
    if (!top) return undefined;
    const placeId = top.place_id;
    let phone: string | undefined;
    // Optional second call for the phone number.
    if (placeId) {
      try {
        const dres = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number&key=${GOOGLE_MAPS_KEY}`,
        );
        if (dres.ok) phone = (await dres.json())?.result?.formatted_phone_number;
      } catch (_) { /* phone is optional */ }
    }
    return {
      name: top.name,
      phone,
      mapsUrl: placeId
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    };
  } catch (err) {
    console.error("findNearestHospital failed:", err);
    return undefined;
  }
}

/** Alert the care team over WhatsApp. Returns true if at least one message was sent. */
export async function notifyCareTeam(
  ctx: CareContext,
  reason: string,
  familyMessage: string,
): Promise<boolean> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID || CARE_TEAM_NUMBERS.length === 0) {
    console.warn("Care-team WhatsApp not configured; skipping alert.");
    return false;
  }
  const body =
    `🚨 Ask Close Eye escalation\n` +
    `Parent: ${ctx.parentName}${ctx.city ? " (" + ctx.city + ")" : ""}\n` +
    `Reason: ${reason}\n` +
    `Family said: "${familyMessage.slice(0, 280)}"\n` +
    `Action: contact the family now.`;

  let anySent = false;
  await Promise.all(
    CARE_TEAM_NUMBERS.map(async (to) => {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { body },
            }),
          },
        );
        if (res.ok) anySent = true;
        else console.error("WhatsApp alert failed:", res.status, await res.text());
      } catch (err) {
        console.error("WhatsApp alert error:", err);
      }
    }),
  );
  return anySent;
}
