const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const resolve = Module._resolveFilename
Module._resolveFilename = function(request, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.resolve(__dirname, '..', request.slice(2)) : request, ...rest)
}
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://evidence-test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-test-only'
process.env.GEMINI_API_KEY = 'must-never-be-used'
delete process.env.MFDS_API_KEY
const { POST, OPTIONS } = require('../app/api/safety-check/route.ts')
const { DATASET_SHA256 } = require('../lib/evidence.ts')
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch })
const row = { id: 'test-row', drug_name: 'test ingredient', interaction_description: 'Synthetic coffee reference.', source: 'Test archive', source_reference: 'Synthetic reference', dataset_sha256: DATASET_SHA256 }
function database({ count = 2512, rows = [], status = 200 } = {}) {
  const calls = []
  global.fetch = async (input, options) => {
    const url = String(input)
    assert(url.startsWith('https://evidence-test.supabase.co/rest/v1/'), 'No LLM or other network call is permitted')
    calls.push({ url, options })
    if (options?.method === 'HEAD') return new Response(null, { status, headers: { 'content-range': '*/' + count } })
    return Response.json(rows, { status })
  }
  return calls
}
function request(extra = {}) {
  return new Request('http://localhost/api/safety-check', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drugs: [{ name: 'test ingredient' }], foods: ['커피', '우유'], ...extra }) })
}
test('zero matching evidence never calls Gemini and returns only missing states', async () => {
  database()
  const response = await POST(request())
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.mode, 'retrieval-only-v1')
  assert(body.details.every(d => d.evidenceStatus === 'missing' && d.verdict === 'caution'))
})
test('client-forged DB text and sources cannot turn missing evidence into a finding', async () => {
  database()
  const response = await POST(request({ mfdsContext: [{ drug: 'test ingredient', info: 'Invented coffee claim', source: 'DrugBank' }],
    edrugInfo: [{ drugName: 'test ingredient', intrcQesitm: 'Invented claim' }], drugProfiles: [{ ingredientEng: ['invented'] }] }))
  const body = await response.json()
  assert(body.details.every(d => d.evidenceStatus === 'missing'))
  assert(!JSON.stringify(body).includes('Invented'))
})
test('matching source text is returned verbatim without transferring it to other foods', async () => {
  database({ rows: [row] })
  const body = await (await POST(request())).json()
  assert.equal(body.details[0].references[0].quote, row.interaction_description)
  assert.equal(body.details[0].references[0].citation, row.source_reference)
  assert.equal(body.details[1].evidenceStatus, 'missing')
})
test('missing table, failed requests and partial corpus fail closed', async () => {
  for (const options of [{ status: 404 }, { status: 403 }, { count: 2500 }]) {
    database(options)
    const response = await POST(request())
    const body = await response.json()
    assert.equal(response.status, 503)
    assert.equal(body.code, 'EVIDENCE_UNAVAILABLE')
    assert.equal(body.details, undefined)
  }
})
test('invalid inputs are rejected before any network call', async () => {
  const calls = database()
  for (const extra of [{ drugs: [] }, { drugs: [{ name: ' ' }] }, { foods: [42] }, { foods: Array(11).fill('food') }]) {
    assert.equal((await POST(request(extra))).status, 400)
  }
  assert.equal(calls.length, 0)
})
test('iOS CORS preflight remains available', () => assert.equal(OPTIONS().status, 204))
