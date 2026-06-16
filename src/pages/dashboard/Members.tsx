import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Bell, MessageSquare, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface Member {
  id: string
  name: string
  email: string
  whatsapp_number: string | null
  notify_visits: boolean
  notify_sos: boolean
}

const MAX_MEMBERS = 3

export function DashboardMembers() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [wa, setWa] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { setError('Failed to load family members.'); setLoading(false); return }
    setMembers(data || [])
    setLoading(false)
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (members.length >= MAX_MEMBERS) { setError(`Maximum ${MAX_MEMBERS} family members allowed.`); return }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('family_members').insert({
      family_user_id: user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      whatsapp_number: wa.trim() || null,
    })
    setSaving(false)
    if (error) {
      setError(error.code === '23505' ? 'That email is already added.' : 'Failed to add member. Please try again.')
      return
    }
    setSuccess(`${name.split(' ')[0]} added. They'll receive visit notifications.`)
    setName(''); setEmail(''); setWa(''); setShowForm(false)
    load()
    setTimeout(() => setSuccess(null), 4000)
  }

  async function removeMember(id: string) {
    const { error } = await supabase.from('family_members').delete().eq('id', id)
    if (error) { setError('Failed to remove member.'); return }
    setMembers(m => m.filter(x => x.id !== id))
  }

  async function toggleField(id: string, field: 'notify_visits' | 'notify_sos', value: boolean) {
    const { error } = await supabase.from('family_members').update({ [field]: value }).eq('id', id)
    if (error) { setError('Failed to update.'); return }
    setMembers(m => m.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Family Members</h1>
        <p className="text-sm text-gray-400 mt-1">
          Add up to {MAX_MEMBERS} family members who receive visit notifications and SOS alerts.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={() => setError(null)} className="font-semibold underline whitespace-nowrap">Dismiss</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl p-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Member list */}
          {members.length === 0 && !showForm ? (
            <div className="text-center py-14 bg-green-50 rounded-2xl">
              <p className="text-4xl mb-3">👨‍👩‍👧</p>
              <p className="font-semibold text-green-900 mb-1">No family members yet</p>
              <p className="text-sm text-gray-400 mb-5">Add family members so they can receive visit updates and SOS alerts.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
              >
                <UserPlus size={15} /> Add first member
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map(m => (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="font-semibold text-green-900">{m.name}</p>
                      <p className="text-sm text-gray-400">{m.email}</p>
                      {m.whatsapp_number && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MessageSquare size={11} /> {m.whatsapp_number}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-50">
                    <Toggle
                      label="Visit notifications"
                      icon={<Bell size={13} />}
                      checked={m.notify_visits}
                      onChange={v => toggleField(m.id, 'notify_visits', v)}
                    />
                    <Toggle
                      label="SOS alerts"
                      icon={<span className="text-xs">🚨</span>}
                      checked={m.notify_sos}
                      onChange={v => toggleField(m.id, 'notify_sos', v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          {showForm ? (
            <form onSubmit={addMember} className="bg-white rounded-2xl border border-green-200 p-5 space-y-4">
              <p className="font-semibold text-green-900 text-sm">Add family member</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Priya Sharma"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="priya@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  WhatsApp number <span className="text-gray-300">(optional — for SOS alerts)</span>
                </label>
                <input
                  value={wa}
                  onChange={e => setWa(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {saving ? 'Adding...' : 'Add member'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : members.length < MAX_MEMBERS ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 border-2 border-dashed border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-700 text-sm font-medium px-5 py-4 rounded-2xl w-full justify-center transition-colors"
            >
              <UserPlus size={16} />
              Add family member ({MAX_MEMBERS - members.length} remaining)
            </button>
          ) : null}

          <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-500">
            <p className="font-medium text-gray-700 mb-1">How notifications work</p>
            <p>Added members receive an email when a visit report is ready. Members with a WhatsApp number also receive SOS alerts when you press the emergency button.</p>
          </div>
        </>
      )}
    </div>
  )
}

function Toggle({ label, icon, checked, onChange }: { label: string; icon: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        {icon} {label}
      </span>
    </label>
  )
}
