const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  module._compile(source, filename)
}

const validation = require('../lib/validation.ts')
const storage = require('../lib/storage.ts')
const { checkSafety } = require('../lib/checkSafety.ts')
const drugs = [{ name: 'UI test medicine', dose: '10mg' }]
const foods = ['Test food']
const result = {
  verdict: 'caution', details: [{ drug: drugs[0].name, food: foods[0], verdict: 'caution', reason: 'Synthetic test only' }],
  disclaimer: 'Test fixture, not medical guidance', checkedAt: '2026-09-06T00:00:00.000Z',
}
const history = { id: 'test', drugs, foods, result }
const realFetch = global.fetch
afterEach(() => { global.fetch = realFetch; delete global.window; delete global.localStorage })

function setStorage(values = {}) {
  const data = new Map(Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]))
  global.window = {}
  global.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  }
  return data
}

test('malformed saved JSON is recoverable', () => {
  for (const raw of [null, '', '{broken']) assert.equal(validation.parseStoredJson(raw), null)
  assert.deepEqual(validation.readHistory('{broken'), [])
  assert.equal(validation.readScanSession('{broken'), null)
})

test('blank or malformed medicine records are rejected and valid names trimmed', () => {
  assert.deepEqual(validation.readDrugs([null, {}, { name: '   ' }, { name: 'Bad dose', dose: {} }, { name: ' Test ' }]), [{ name: 'Test' }])
  assert.deepEqual(validation.readDrugs({ name: 'Not an array' }), [])
})

test('food drafts are normalized and deduplicated', () => {
  assert.deepEqual(validation.readFoods([' milk ', 'milk', '', null, 3]), ['milk'])
  assert.deepEqual(validation.readFoods({}), [])
})

test('scan drafts reject invalid structures without throwing', () => {
  assert.equal(validation.readScanSession('{"drugs":{}}'), null)
  assert.deepEqual(validation.readScanSession('{"drugs":[{"name":"Test"}]}').drugs, [{ name: 'Test' }])
})

test('analysis result requires valid details and timestamp', () => {
  assert.equal(validation.isSafetyResult(result), true)
  for (const invalid of [{ error: 'Server error' }, { ...result, verdict: 'unknown' },
    { ...result, details: [] }, { ...result, checkedAt: 'bad-date' },
    { ...result, details: [{ ...result.details[0], reason: '' }] },
    { ...result, details: [{ ...result.details[0], source: {} }] }]) {
    assert.equal(validation.isSafetyResult(invalid), false)
  }
})

test('invalid history entries do not crash or appear as successful results', () => {
  assert.deepEqual(validation.readHistory(JSON.stringify([null, {}, { ...history, result: { error: 'failed' } }, history])), [history])
  assert.equal(validation.readHistory(JSON.stringify(Array(15).fill(history))).length, 10)
})

test('newest medication dose wins when groups contain duplicate names', () => {
  setStorage({ medGroups: [
    { id: 'new', scannedAt: '2026-09-06', source: 'manual', drugs: [{ name: 'Test', dose: '20mg' }] },
    { id: 'old', scannedAt: '2026-09-05', source: 'manual', drugs: [{ name: 'Test', dose: '10mg' }] },
  ] })
  assert.deepEqual(storage.getSavedDrugs(), [{ name: 'Test', dose: '20mg' }])
})

test('legacy medications migrate after invalid group data', () => {
  setStorage({ medGroups: { corrupt: true }, savedMedications: [...drugs, null, { name: '' }] })
  assert.deepEqual(storage.getSavedDrugs(), drugs)
  assert.equal(storage.getMedGroups().length, 1)
})

test('empty canonical groups do not resurrect a stale mirror', () => {
  setStorage({ medGroups: [], savedMedications: drugs })
  assert.deepEqual(storage.getSavedDrugs(), [])
})

test('malformed groups, profile fields and legacy records are ignored', () => {
  setStorage({ medGroups: [null, { drugs }], savedMedications: { drugs }, userProfile: { name: {}, age: '40', gender: 'invalid' } })
  assert.deepEqual(storage.getSavedDrugs(), [])
  assert.deepEqual(storage.getProfile(), { age: '40' })
})

function mockResponses(responses) {
  const calls = []
  global.fetch = async (url, options) => {
    calls.push({ url, options })
    const next = responses.shift()
    assert(next, 'Unexpected extra network call')
    return new Response(typeof next.body === 'string' ? next.body : JSON.stringify(next.body), { status: next.status ?? 200 })
  }
  return calls
}
const db = { contraindications: [], edrugInfo: [], drugProfiles: [], matchCount: 0 }
const run = () => checkSafety(drugs, foods, new AbortController().signal, () => {})

test('DB failure stops before analysis', async () => {
  const calls = mockResponses([{ status: 500, body: { error: 'DB unavailable' } }])
  await assert.rejects(run, /약품 데이터 조회/)
  assert.equal(calls.length, 1)
})

test('malformed DB success payload is rejected', async () => {
  mockResponses([{ body: { error: 'DB unavailable' } }])
  await assert.rejects(run, /약품 데이터 응답/)
})

test('analysis HTTP error cannot become a successful result', async () => {
  mockResponses([{ body: db }, { status: 503, body: { error: 'Busy' } }])
  await assert.rejects(run, /분석 서버/)
})

test('incomplete analysis payload cannot become a successful result', async () => {
  mockResponses([{ body: db }, { body: { ...result, details: [] } }])
  await assert.rejects(run, /분석 결과가 불완전/)
})

test('non-JSON analysis responses are rejected', async () => {
  mockResponses([{ body: db }, { body: '<html>Gateway error</html>' }])
  await assert.rejects(run)
})

test('valid analysis passes selected inputs and abort signal through both requests', async () => {
  const calls = mockResponses([{ body: db }, { body: result }])
  const controller = new AbortController()
  let stats
  assert.deepEqual(await checkSafety(drugs, foods, controller.signal, value => { stats = value }), result)
  assert.equal(calls.length, 2)
  assert(calls.every(call => call.options.signal === controller.signal))
  assert.deepEqual(JSON.parse(calls[1].options.body).drugs, drugs)
  assert.deepEqual(stats, { matchCount: 0, edrugCount: 0, searchedDrugs: 1, searchedFoods: 1 })
})

test('cancelled analysis propagates abort', async () => {
  global.fetch = async () => { throw new DOMException('Cancelled', 'AbortError') }
  await assert.rejects(run, { name: 'AbortError' })
})
