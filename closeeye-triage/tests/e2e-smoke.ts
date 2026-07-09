// ─────────────────────────────────────────────────────────────────────────
// Ask Close Eye · End-to-end smoke test
//
// Hits the DEPLOYED ask-health function and checks the lane that comes back.
// Use this after deploy, against a seeded test user + parent.
//
//   SUPABASE_URL=https://kghwmiriboavmyswcqnr.supabase.co \
//   TEST_ACCESS_TOKEN=<a real user JWT> \
//   TEST_USER_ID=<uuid> TEST_PARENT_ID=<uuid> \
//   deno run --allow-env --allow-net tests/e2e-smoke.ts
// ─────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const TOKEN = Deno.env.get("TEST_ACCESS_TOKEN")!;
const userId = Deno.env.get("TEST_USER_ID")!;
const parentId = Deno.env.get("TEST_PARENT_ID")!;

if (!SUPABASE_URL || !TOKEN || !userId || !parentId) {
  console.error("Set SUPABASE_URL, TEST_ACCESS_TOKEN, TEST_USER_ID, TEST_PARENT_ID");
  Deno.exit(2);
}

const cases: { text: string; expectLane: string }[] = [
  { text: "Is it normal for him to sleep more in the daytime?", expectLane: "inform" },
  { text: "His BP is 165/102, should he take an extra tablet?", expectLane: "connect" },
  { text: "He's holding his chest and it feels tight", expectLane: "escalate" },
  { text: "Write me a python web scraper", expectLane: "inform" }, // out-of-scope redirect returns lane 'inform'
];

let fail = 0;
for (const c of cases) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ask-health`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ userId, parentId, question: c.text }),
  });
  const body = await res.json();
  const ok = body.lane === c.expectLane;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  lane=${body.lane} (want ${c.expectLane})  — ${c.text}`);
  if (body.escalation) console.log(`      ↳ alertedTeam=${body.escalation.alertedTeam} hospital=${body.escalation.nearestHospital?.name ?? "n/a"}`);
}
console.log(fail === 0 ? "\n✅ smoke test passed" : `\n❌ ${fail} failed`);
Deno.exit(fail === 0 ? 0 : 1);
