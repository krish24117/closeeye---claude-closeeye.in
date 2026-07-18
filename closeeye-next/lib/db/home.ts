/**
 * Sprint 2 — the Workspace Home data. Family-level, state-driven (lib/space/state). Reads the
 * Family Graph directly (no FamilyDataProvider — /space runs in AppShell "lite" mode), one
 * batched ledger query across every person. Fail-safe: throws on a real read error so the Home
 * can show a calm retry instead of hanging.
 *
 * Sprint-2 signals are the ones we can honestly derive now: a positive signal (a guardian/visit
 * observation) → healthy, else getting-to-know. Active-care, emergency and attention-from-blanks
 * wire in as their sources land (People & Activity S4, Care S5) — the state FRAMEWORK is already
 * complete and tested (lib/space/state); Home simply feeds it more signals over time.
 */
import { supabase } from '@/lib/supabase'
import { derivePersonState, rollUp, type WorkspaceState, type PersonSignals } from '@/lib/space/state'
import { formatTime, formatDate } from '@/lib/platform/locale'
import { DEFAULT_REGION_CODE } from '@/lib/platform/regions'

export interface HomePerson {
  id: string
  name: string
  relationship: string | null
  regionCode: string
  state: WorkspaceState
}
export interface HomeActivity { id: string; when: string; text: string; person: string }
export interface HomeAlert { id: string; text: string; actionLabel: string; href: string }

export interface HomeData {
  userName: string
  /** The rolled-up Workspace state — the most urgent person's state. */
  state: WorkspaceState
  people: HomePerson[]
  activity: HomeActivity[]
  alerts: HomeAlert[]
}

const firstName = (s: string) => (s || '').trim().split(/\s+/)[0] || s

function whenLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const time = formatTime(d, DEFAULT_REGION_CODE, { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  return d.toDateString() === now.toDateString() ? `Today · ${time}` : formatDate(d, DEFAULT_REGION_CODE, { day: 'numeric', month: 'short' })
}

interface LedgerRow { loved_one_id: string; label: string | null; body: string; entry_type: string; created_at: string }

export async function fetchHome(): Promise<HomeData | null> {
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  const user = auth.user
  if (!user) return null

  const [profRes, losRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('loved_ones').select('id, full_name, relationship, region_code').eq('family_user_id', user.id).order('created_at', { ascending: true }).limit(20),
  ])
  if (losRes.error) throw new Error(losRes.error.message)
  const userName = (profRes.data?.full_name || (user.user_metadata?.full_name as string) || 'there').split(' ')[0] || 'there'
  const members = losRes.data ?? []
  if (!members.length) return { userName, state: 'getting_to_know', people: [], activity: [], alerts: [] }

  const ids = members.map((m) => m.id)
  const ledgerRes = await supabase
    .from('family_ledger')
    .select('loved_one_id, label, body, entry_type, created_at')
    .in('loved_one_id', ids)
    .order('created_at', { ascending: false })
    .limit(60)
  if (ledgerRes.error) throw new Error(ledgerRes.error.message)
  const entries = (ledgerRes.data ?? []) as LedgerRow[]
  const nameOf = new Map(members.map((m) => [m.id, m.full_name]))
  const isObservation = (t: string) => t === 'guardian_observation' || t === 'visit_observation'

  const people: HomePerson[] = members.map((m) => {
    const own = entries.filter((e) => e.loved_one_id === m.id)
    const signals: PersonSignals = {
      hasPositiveSignal: own.some((e) => isObservation(e.entry_type)),
      openEssentialBlanks: 0, // wires with the understanding engine in Sprint 4
      hasActiveVisit: false, // wires with Care in Sprint 5
      hasEmergency: false, // transient; handled real-time in the crisis flow
    }
    return { id: m.id, name: m.full_name, relationship: m.relationship, regionCode: m.region_code ?? 'IN', state: derivePersonState(signals) }
  })

  const state = rollUp(people.map((p) => p.state))

  const activity: HomeActivity[] = entries
    .filter((e) => e.entry_type === 'family_fact' || isObservation(e.entry_type))
    .slice(0, 8)
    .map((e, i) => ({ id: `act-${i}`, when: whenLabel(e.created_at), text: e.body, person: firstName(nameOf.get(e.loved_one_id) ?? '') }))

  const alerts: HomeAlert[] = people
    .filter((p) => p.state === 'getting_to_know')
    .map((p) => ({ id: `alert-${p.id}`, text: `Still getting to know ${firstName(p.name)}.`, actionLabel: 'Tell CloseEye more', href: '/space/ask' }))

  return { userName, state, people, activity, alerts }
}
