const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const { buildEvidenceResult, DATASET_SHA256 } = require('../lib/evidence.ts')
const { isEvidenceResult } = require('../lib/validation.ts')
const alcohol = 'Avoid alcohol. Alcohol may increase the risk of hepatotoxicity.'
const water = 'Take with a full glass of water.'
function reference(food, quote, overrides = {}) {
  return { id: 'synthetic-layout-reference', drug: '검증약', food, matchedDrug: 'Test ingredient',
    matchedTerm: food === '물' ? 'water' : 'alcohol', quote, source: 'Synthetic archive',
    citation: 'Synthetic reference, not clinical guidance', datasetSha256: DATASET_SHA256, ...overrides }
}
function result(food, refs, ingredients = ['Test ingredient']) {
  return buildEvidenceResult([{ name: '검증약' }], [food], refs, { 검증약: ingredients })
}

test('an exact avoid-alcohol source produces a Korean avoidance instruction, never an all-clear', () => {
  const detail = result('알코올', [reference('알코올', alcohol)]).details[0]
  assert.equal(detail.guidance?.action, 'avoid')
  assert.equal(detail.guidance.title, '술은 피하세요')
  assert.match(detail.guidance.reason, /간 손상/)
  assert.equal(detail.references[0].quote, alcohol)
  assert.equal(detail.verdict, 'caution', 'The legacy field is not a newly generated clinical grade')
})

test('explicit water administration permits only the named water combination with its instructions', () => {
  const detail = result('물', [reference('물', water)]).details[0]
  assert.equal(detail.guidance?.action, 'allowed')
  assert.equal(detail.guidance.title, '물과 함께 복용하세요')
  assert.match(detail.guidance.reason, /한 컵/)
  assert.match(detail.guidance.reason, /용법/)
})

test('missing or merely matching source text is never a green permission', () => {
  for (const refs of [[], [reference('알코올', 'Synthetic alcohol information.')]]) {
    const detail = result('알코올', refs).details[0]
    assert.equal(detail.guidance?.action, 'check')
    assert.equal(detail.guidance.title, '약사에게 확인하세요')
  }
})

test('negated, conditional or unreviewed wording cannot trigger an automatic instruction', () => {
  for (const quote of ['Do not avoid alcohol.', 'Avoid alcohol only if your clinician instructs you.',
    water + ' Only under an additional condition.', 'No interaction with water was found.']) {
    const food = quote.includes('water') ? '물' : '알코올'
    assert.equal(result(food, [reference(food, quote)]).details[0].guidance?.action, 'check')
  }
})

test('an avoidance instruction cannot be transferred to a different food, drug, or dataset', () => {
  for (const overrides of [{ food: '커피' }, { drug: '다른약' }, { datasetSha256: 'unapproved' }]) {
    assert.equal(result('알코올', [reference('알코올', alcohol, overrides)]).details[0].guidance?.action, 'check')
  }
  assert.equal(result('커피', [reference('커피', alcohol)]).details[0].guidance?.action, 'check')
})

test('green requires explicit permission for every identified ingredient and all matching references', () => {
  const ref = reference('물', water)
  for (const [refs, ingredients] of [[[ref], []], [[ref], ['Test ingredient', 'Uncovered ingredient']],
    [[ref, reference('물', 'Additional water information.', { id: 'another' })], ['Test ingredient']]]) {
    assert.equal(result('물', refs, ingredients).details[0].guidance?.action, 'check')
  }
})

test('display guidance cannot be forged independently of retrieved source text', () => {
  const value = result('알코올', [])
  value.details[0].guidance = { action: 'allowed', title: 'Invented permission', reason: 'Invented reason' }
  assert.equal(isEvidenceResult(value), false)
})

test('a medicine name cannot inherit ingredient metadata from Object.prototype', () => {
  const value = buildEvidenceResult([{ name: 'constructor' }], ['물'], [])
  assert.deepEqual(value.details[0].ingredientNames, [])
  assert.equal(isEvidenceResult(value), true)
})
