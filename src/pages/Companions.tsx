import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TbCheck,
  TbEye,
  TbPhone,
  TbUsers,
  TbShieldCheck,
  TbCertificate,
  TbUserCheck,
  TbRosetteDiscountCheck,
  TbId,
  TbMapPin,
  TbHeartHandshake,
  TbStethoscope,
  TbEmergencyBed,
  TbFileReport,
  TbMessageCircle,
  TbPlus,
} from 'react-icons/tb'
import { supabase } from '@/lib/supabase'

const STAGES = [
  {
    title: 'Online application',
    description:
      'Every applicant fills a detailed form covering their background, motivation, and why they want to work with elders. We read every application personally — not a bot, not a filter.',
    PillIcon: TbEye,
    pill: 'Read personally by Krishna and Aishwarya',
  },
  {
    title: 'Phone screening with Aishwarya',
    description:
      'A 30-minute call with our Chief of Care. We assess compassion, reliability, and genuine motivation. The majority of applications stop at this stage.',
    PillIcon: TbPhone,
    pill: 'Conducted by co-founder Aishwarya',
  },
  {
    title: 'In-person interview',
    description:
      "Meet Krishna and Aishwarya face to face. Scenario-based conversations. Reference checks begin. We look for people who'd treat our own parents the way we would.",
    PillIcon: TbUsers,
    pill: 'Both founders present',
  },
  {
    title: 'Background verification',
    description:
      'Police clearance certificate. Aadhaar verification. Address confirmation. Previous employer reference check. Every document verified before proceeding.',
    PillIcon: TbShieldCheck,
    pill: 'Government-verified identity and criminal record',
  },
  {
    title: 'Close Eye training — 3 days',
    description:
      'Elder care fundamentals. Health observation. Emergency protocols. WhatsApp reporting system. Training curriculum designed by our medical co-founder Dr. Sidharth.',
    PillIcon: TbCertificate,
    pill: 'Curriculum by Dr. Sidharth, MBBS',
  },
  {
    title: 'Supervised visits — first 5',
    description:
      'Krishna accompanies the companion on their first five visits. We assess quality on every visit. Families give feedback after each one before the companion goes solo.',
    PillIcon: TbUserCheck,
    pill: 'Founder-supervised before independent visits',
  },
  {
    title: 'Close Eye certified ✓',
    description:
      'Only after clearing all seven stages does a companion receive certification and begin independent visits. The verified badge on every companion profile means they passed everything.',
    PillIcon: TbRosetteDiscountCheck,
    pill: 'Trusted to visit independently',
  },
]

const CARRY = [
  {
    Icon: TbId,
    title: 'Aadhaar verified',
    desc: 'Government ID confirmed, photographed, and on file with Close Eye permanently.',
  },
  {
    Icon: TbShieldCheck,
    title: 'Police clearance',
    desc: 'No criminal record. Certificate verified and stored. Re-checked annually.',
  },
  {
    Icon: TbMapPin,
    title: 'GPS on every visit',
    desc: 'Check-in timestamped and location recorded the moment companion arrives at the door.',
  },
  {
    Icon: TbCertificate,
    title: 'Close Eye certified',
    desc: '3-day training completed, 5 supervised visits passed, and personally assessed by our founding team.',
  },
]

const TRAINED = [
  {
    Icon: TbHeartHandshake,
    title: 'Elder dignity',
    body: 'How to treat every elder as a person with pride, stories, and preferences — not as a patient.',
  },
  {
    Icon: TbStethoscope,
    title: 'Health observation',
    body: 'What signs to look for. Medicine checking. When to escalate and who to call.',
  },
  {
    Icon: TbEmergencyBed,
    title: 'Emergency response',
    body: 'Falls, sudden illness, chest pain. Exactly what to do in every scenario.',
  },
  {
    Icon: TbFileReport,
    title: 'Report writing',
    body: 'How to write a WhatsApp report that makes an NRI family feel fully informed and reassured.',
  },
  {
    Icon: TbMessageCircle,
    title: 'Family communication',
    body: 'What to share and how to share it with empathy, accuracy, and genuine care.',
  },
  {
    Icon: TbMapPin,
    title: 'Safety protocols',
    body: 'GPS check-in. Photo documentation. Escalation chain. Every visit tracked and timestamped.',
  },
]

const STATS = [
  { number: '7', label: 'Verification stages' },
  { number: '< 15%', label: 'Application acceptance rate' },
  { number: '3 days', label: 'Mandatory training' },
  { number: '5 visits', label: 'Supervised before solo' },
]

const styles = `
.cmp-section { padding-left: 64px; padding-right: 64px; }
.cmp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.cmp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.cmp-cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
@media (max-width: 767px) {
  .cmp-section { padding-left: 24px; padding-right: 24px; }
  .cmp-grid-2 { grid-template-columns: 1fr; }
  .cmp-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .cmp-cta-grid { grid-template-columns: 1fr; }
  .cmp-hero-h1 { font-size: 36px !important; }
  .cmp-pad-80 { padding-top: 56px !important; padding-bottom: 56px !important; }
  .cmp-pad-64 { padding-top: 48px !important; padding-bottom: 48px !important; }
  .cmp-h2-36 { font-size: 28px !important; }
}
@media (max-width: 480px) {
  .cmp-grid-3 { grid-template-columns: 1fr; }
}
`

export function CompanionsPage() {
  const [totalVisits, setTotalVisits] = useState<number>(120)
  const [rating, setRating] = useState<string>('5.0')
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { count } = await supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
        if (active && typeof count === 'number' && count > 0) setTotalVisits(count)
      } catch {
        /* keep fallback */
      }
      try {
        const { data } = await supabase.from('visits').select('mood_score')
        if (active && Array.isArray(data) && data.length) {
          const scores = data
            .map((r: any) => Number(r?.mood_score))
            .filter((n: number) => !isNaN(n) && n > 0)
          if (scores.length) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length
            setRating(avg.toFixed(1))
          }
        }
      } catch {
        /* keep fallback */
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <div style={{ overflowX: 'hidden' }}>
      <style>{styles}</style>

      {/* SECTION 1 — HERO */}
      <section
        className="cmp-section cmp-pad-80"
        style={{ background: 'var(--cream)', paddingTop: 80, paddingBottom: 80 }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--forest)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            How we verify companions
          </p>
          <h1
            className="cmp-hero-h1"
            style={{ fontSize: 48, fontWeight: 700, color: 'var(--black)', lineHeight: 1.15, margin: 0 }}
          >
            Every companion who enters your parent's home is verified at seven levels.
          </h1>
          <p
            style={{
              fontSize: 18,
              fontWeight: 400,
              color: 'var(--gray-dark)',
              maxWidth: 560,
              lineHeight: 1.7,
              marginTop: 20,
            }}
          >
            We don't just hire caregivers. We find people who genuinely care — then put them through a
            process that most don't pass. Here is exactly what that looks like.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 48,
              flexWrap: 'wrap',
              marginTop: 36,
              paddingTop: 36,
              borderTop: '0.5px solid var(--gray-light)',
            }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--forest)' }}>{s.number}</div>
                <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--gray-mid)', marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE 7 STAGES */}
      <section
        className="cmp-section cmp-pad-80"
        style={{ background: 'var(--white)', paddingTop: 80, paddingBottom: 80 }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--gray-mid)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 12,
            }}
          >
            The selection process
          </p>
          <h2 className="cmp-h2-36" style={{ fontSize: 36, fontWeight: 700, color: 'var(--black)', margin: 0 }}>
            Seven stages. Because your family deserves certainty.
          </h2>
          <p style={{ fontSize: 16, fontWeight: 400, color: 'var(--gray-mid)', marginBottom: 48, marginTop: 12 }}>
            We would rather have fewer companions than compromise on quality once.
          </p>

          <div style={{ maxWidth: 680 }}>
            {STAGES.map((stage, i) => {
              const isLast = i === STAGES.length - 1
              const isSeven = i === 6
              const { PillIcon } = stage
              return (
                <div key={stage.title} style={{ display: 'flex', gap: 20, position: 'relative', paddingBottom: isLast ? 0 : 36 }}>
                  {!isLast && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 19,
                        top: 40,
                        width: 1,
                        height: 'calc(100% - 8px)',
                        background: 'var(--gray-light)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: isSeven ? 'var(--sage)' : 'var(--forest)',
                      color: 'var(--sage)',
                      fontSize: 16,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {isSeven ? <TbCheck size={20} style={{ color: 'var(--forest)' }} /> : i + 1}
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--black)' }}>{stage.title}</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: 'var(--gray-mid)',
                        lineHeight: 1.65,
                        margin: '6px 0 10px',
                      }}
                    >
                      {stage.description}
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(14,42,31,0.06)',
                        borderRadius: 100,
                        padding: '5px 14px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--forest)',
                      }}
                    >
                      <PillIcon size={13} />
                      {stage.pill}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 — WHAT COMPANIONS CARRY */}
      <section
        className="cmp-section cmp-pad-64"
        style={{ background: 'var(--cream)', paddingTop: 64, paddingBottom: 64 }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--black)', margin: 0 }}>
            What every verified companion carries
          </h2>
          <p style={{ fontSize: 15, fontWeight: 400, color: 'var(--gray-mid)', marginBottom: 32, marginTop: 10 }}>
            Before any companion enters your parent's home, these four things are confirmed and on record.
          </p>
          <div className="cmp-grid-2">
            {CARRY.map((c) => {
              const { Icon } = c
              return (
                <div
                  key={c.title}
                  style={{
                    background: 'var(--white)',
                    borderRadius: 'var(--radius-card)',
                    padding: 24,
                    border: '0.5px solid var(--gray-light)',
                    borderTop: '3px solid var(--sage)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: 'rgba(14,42,31,0.06)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} style={{ color: 'var(--forest)' }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)', margin: '12px 0 6px' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--gray-mid)', lineHeight: 1.6 }}>
                    {c.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 — TRAINED IN */}
      <section
        className="cmp-section cmp-pad-64"
        style={{ background: 'var(--white)', paddingTop: 64, paddingBottom: 64 }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--black)', margin: '0 0 24px' }}>
            What every companion knows before their first solo visit
          </h2>
          <div className="cmp-grid-3">
            {TRAINED.map((t) => {
              const { Icon } = t
              return (
                <div
                  key={t.title}
                  style={{
                    background: 'var(--cream)',
                    borderRadius: 'var(--radius-card)',
                    padding: 22,
                    border: '0.5px solid var(--cream-dark)',
                  }}
                >
                  <Icon size={24} style={{ color: 'var(--forest)' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', margin: '10px 0 6px' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-mid)', lineHeight: 1.6 }}>
                    {t.body}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5 — MEET OUR COMPANIONS */}
      <section
        className="cmp-section cmp-pad-64"
        style={{ background: 'var(--cream)', paddingTop: 64, paddingBottom: 64 }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--black)', margin: 0 }}>
            Meet our verified companions
          </h2>
          <p style={{ fontSize: 15, fontWeight: 400, color: 'var(--gray-mid)', marginBottom: 28, marginTop: 10 }}>
            Every companion below has completed all seven stages. You can see their certifications, visits,
            and ratings.
          </p>

          <div className="cmp-grid-3">
            {/* CARD 1 — KRISHNA */}
            <div
              style={{
                background: 'var(--white)',
                borderRadius: 'var(--radius-card)',
                padding: 22,
                border: '0.5px solid var(--gray-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                  {!imgError ? (
                    <img
                      src="/krishna.jpg"
                      alt="Krishna"
                      onError={() => setImgError(true)}
                      style={{
                        width: 52,
                        height: 52,
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        border: '2px solid var(--sage)',
                        borderRadius: '50%',
                        position: 'relative',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        border: '2px solid var(--sage)',
                        background: 'var(--forest)',
                        color: 'var(--sage)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      K
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 18,
                      height: 18,
                      background: 'var(--white)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TbCheck size={12} style={{ color: 'var(--forest)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)' }}>Krishna</div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-mid)' }}>
                    Founder and lead companion
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--gray-light)', margin: '14px 0' }} />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: '✓ Verified', bg: '#DCFCE7', color: '#15803D' },
                  { label: 'Aadhaar', bg: '#DBEAFE', color: '#1D4ED8' },
                  { label: 'Police cleared', bg: '#DBEAFE', color: '#1D4ED8' },
                  { label: 'Close Eye certified', bg: 'var(--forest)', color: 'var(--sage)' },
                ].map((p) => (
                  <span
                    key={p.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: p.bg,
                      color: p.color,
                      borderRadius: 100,
                      padding: '3px 10px',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {p.label}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  marginTop: 14,
                }}
              >
                {[
                  { v: String(totalVisits), l: 'Total visits' },
                  { v: rating, l: 'Rating' },
                  { v: '2025', l: 'Since' },
                ].map((s) => (
                  <div key={s.l}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--forest)' }}>{s.v}</div>
                    <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-mid)', marginTop: 2 }}>
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 2 — IN TRAINING */}
            <div
              style={{
                background: 'var(--white)',
                border: '0.5px dashed var(--gray-light)',
                borderRadius: 'var(--radius-card)',
                padding: 22,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--gray-light)',
                    color: 'var(--gray-mid)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ?
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-mid)' }}>Companion 2</div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-mid)' }}>
                    In training — stage 6 of 7
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ background: 'var(--gray-light)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--forest)', width: '85%', height: 6, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-mid)', marginTop: 8 }}>
                  Stage 6 of 7 complete
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--gray-mid)', marginTop: 14 }}>
                Completing supervised visits. Certified soon.
              </div>
            </div>

            {/* CARD 3 — APPLY CTA */}
            <div
              style={{
                background: 'var(--white)',
                border: '0.5px dashed var(--gray-light)',
                borderRadius: 'var(--radius-card)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                padding: 22,
              }}
            >
              <TbPlus size={36} style={{ color: 'var(--gray-mid)' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', marginTop: 12 }}>
                We are growing
              </div>
              <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--gray-mid)', marginTop: 4 }}>
                Applications open for Hyderabad companions
              </div>
              <Link
                to="/join-as-companion"
                style={{
                  border: '1px solid var(--forest)',
                  borderRadius: 'var(--radius-btn)',
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--forest)',
                  marginTop: 16,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Apply to join →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — BOTTOM CTA */}
      <section
        className="cmp-section cmp-pad-64"
        style={{ background: 'var(--forest)', paddingTop: 64, paddingBottom: 64 }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="cmp-cta-grid">
            {/* LEFT */}
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--white)' }}>
                Looking for a companion for your family?
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.6,
                  marginTop: 12,
                }}
              >
                Register your family and we will personally match you with the right companion.
              </div>
              <Link
                to="/auth?mode=signup"
                style={{
                  background: 'var(--white)',
                  color: 'var(--forest)',
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 20,
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                Register your family →
              </Link>
            </div>

            {/* RIGHT */}
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius-card)',
                padding: 32,
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)' }}>
                Want to join as a companion?
              </div>
              <div style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.65)', marginTop: 10 }}>
                If you genuinely care about elders and want meaningful work, we would love to hear from you.
              </div>
              <Link
                to="/join-as-companion"
                style={{
                  background: 'var(--sage)',
                  color: 'var(--forest)',
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 20,
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                Apply to be a companion →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
