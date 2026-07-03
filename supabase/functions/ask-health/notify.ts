// Ask Close Eye · Escalation helpers
//
// findNearestHospital() — Google Places (optional, needs GOOGLE_MAPS_API_KEY + parent location).
// notifyCareTeam()      — Twilio WhatsApp to coordinator numbers in CARE_TEAM_WHATSAPP.
//                         Uses TWILIO_WHATSAPP_TEMPLATE_SID if set; falls back to freeform Body.
//
// Both fail soft — an escalation must NEVER be blocked by a notification error.
// The family still gets the emergency message and the ambulance number regardless.

import type { CareContext, NearestHospital } from "./types.ts";

const GOOGLE_MAPS_KEY   = Deno.env.get("GOOGLE_MAPS_API_KEY");
const TWILIO_SID        = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN      = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WA_FROM    = Deno.env.get("TWILIO_WHATSAPP_FROM");          // already whatsapp:+E.164
const TWILIO_WA_TMPL    = Deno.env.get("TWILIO_WHATSAPP_TEMPLATE_SID");  // optional
const CARE_TEAM_NUMBERS = (Deno.env.get("CARE_TEAM_WHATSAPP") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

export async function notifyCareTeam(
  ctx: CareContext,
  reason: string,
  familyMessage: string,
): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_WA_FROM || CARE_TEAM_NUMBERS.length === 0) {
    console.warn("Care-team WhatsApp not configured (TWILIO_WHATSAPP_FROM / CARE_TEAM_WHATSAPP); skipping alert.");
    return false;
  }
  const alertBody =
    `Ask Close Eye escalation\n` +
    `Parent: ${ctx.parentName}${ctx.city ? " (" + ctx.city + ")" : ""}\n` +
    `Reason: ${reason}\n` +
    `Family: "${familyMessage.slice(0, 280)}"\n` +
    `Action: contact the family now.`;

  let anySent = false;
  await Promise.all(
    CARE_TEAM_NUMBERS.map(async (to) => {
      const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to.startsWith("+") ? to : "+" + to}`;
      try {
        const params = TWILIO_WA_TMPL
          ? new URLSearchParams({
              From: TWILIO_WA_FROM,
              To: toNumber,
              ContentSid: TWILIO_WA_TMPL,
              ContentVariables: JSON.stringify({ "1": ctx.parentName, "2": reason, "3": familyMessage.slice(0, 200) }),
            })
          : new URLSearchParams({ From: TWILIO_WA_FROM, To: toNumber, Body: alertBody });
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          },
        );
        if (res.ok) anySent = true;
        else console.error("WhatsApp care-team alert failed:", res.status, await res.text());
      } catch (err) {
        console.error("WhatsApp care-team alert error:", err);
      }
    }),
  );
  return anySent;
}
