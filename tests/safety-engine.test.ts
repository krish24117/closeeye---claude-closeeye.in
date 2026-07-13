// CloseEye Safety Engine — crisis classification + resource routing.
// Run: node --test tests/safety-engine.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyCrisis } from '../supabase/functions/ask-health/safety-engine.ts'
import { routeResources } from '../supabase/functions/ask-health/resource-router.ts'
import { INDIA_RESOURCE_PACK } from '../supabase/functions/ask-health/resources.india.ts'

test('physical life-threat → medical_emergency / EMERGENCY_SERVICES', () => {
  const c = classifyCrisis('my baby is not breathing')
  assert.equal(c?.category, 'medical_emergency')
  assert.equal(c?.action, 'EMERGENCY_SERVICES')
  assert.equal(c?.severity, 'critical')
})

test('suicidal ideation → mental_health_crisis / CRISIS_HELPLINE (never 108)', () => {
  assert.equal(classifyCrisis("some days I don't see the point")?.category, 'mental_health_crisis')
  assert.equal(classifyCrisis('I want to end my life')?.action, 'CRISIS_HELPLINE')
  assert.equal(classifyCrisis('I feel suicidal')?.action, 'CRISIS_HELPLINE')
})

test('safeguarding → SAFEGUARDING_SUPPORT (never 108), routed to a human', () => {
  const child = classifyCrisis('I got so frustrated I shook my baby to make her stop crying')
  assert.equal(child?.category, 'safeguarding_child')
  assert.equal(child?.action, 'SAFEGUARDING_SUPPORT')
  assert.equal(child?.escalateToHuman, true)
  assert.equal(classifyCrisis('my father hits my mother when he is angry')?.category, 'safeguarding_adult')
})

test('false-positive guard — exhausted-parent hyperbole is NOT a crisis', () => {
  assert.equal(classifyCrisis('some nights I could kill him, he just will not sleep'), null)
  assert.equal(classifyCrisis('this toddler is going to be the death of me'), null)
})

test('benign messages classify as no-crisis (null)', () => {
  assert.equal(classifyCrisis('my baby has been crying for two hours, how can I calm her'), null)
  assert.equal(classifyCrisis("what foods help my mother's diabetes"), null)
  assert.equal(classifyCrisis('my father has a mild fever and is resting'), null)
})

test('Resource Router maps action → India resources (NO numbers live in the engine)', () => {
  const emergency = routeResources('EMERGENCY_SERVICES', 'medical_emergency', INDIA_RESOURCE_PACK)
  assert.equal(emergency.primary?.number, '108')

  const mh = routeResources('CRISIS_HELPLINE', 'mental_health_crisis', INDIA_RESOURCE_PACK)
  assert.equal(mh.primary?.number, '14416')

  const child = routeResources('SAFEGUARDING_SUPPORT', 'safeguarding_child', INDIA_RESOURCE_PACK)
  assert.equal(child.primary?.number, '1098')

  const adult = routeResources('SAFEGUARDING_SUPPORT', 'safeguarding_adult', INDIA_RESOURCE_PACK)
  assert.equal(adult.primary?.number, '181')
})

test('end-to-end: classify then route, for each worklist case', () => {
  const cases = [
    { input: 'my baby is not breathing', number: '108' },
    { input: "some days I don't see the point", number: '14416' },
    { input: 'I shook my baby to make her stop', number: '1098' },
    { input: 'my father hits my mother', number: '181' },
  ]
  for (const { input, number } of cases) {
    const c = classifyCrisis(input)
    assert.ok(c, `expected a classification for: "${input}"`)
    const r = routeResources(c.action, c.category, INDIA_RESOURCE_PACK)
    assert.equal(r.primary?.number, number, `wrong resource for: "${input}"`)
  }
})
