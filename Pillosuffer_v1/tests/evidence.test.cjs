const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}
const { buildEvidenceResult, findEvidence, sameProduct, DATASET_SHA256 } = require('../lib/evidence.ts')
const drugs = [{ name: 'Test medicine' }]
const foods = ['커피', '우유']
const row = { id: 'fixture-id', drug_name: 'test ingredient', interaction_description: 'Synthetic reference mentioning coffee; not medical guidance.', source: 'Test archive', source_reference: 'Test reference', dataset_sha256: DATASET_SHA256 }

test('no records never produce a safe verdict or generated medical explanation', () => {
  const result = buildEvidenceResult(drugs, foods, [])
  assert.equal(result.mode, 'retrieval-only-v1')
  assert.equal(result.details.length, 2)
  assert(result.details.every(d => d.verdict === 'caution' && d.evidenceStatus === 'missing' && d.references.length === 0))
  assert(result.details.every(d => /안전하다는 뜻이 아닙니다/.test(d.reason)))
})

test('references stay isolated to the exact requested drug and food pair', () => {
  const refs = findEvidence(drugs[0].name, foods[0], ['test ingredient'], [row])
  const result = buildEvidenceResult([...drugs, { name: 'Another medicine' }], foods, refs)
  assert.equal(result.details[0].evidenceStatus, 'found')
  assert(result.details.slice(1).every(d => d.evidenceStatus === 'missing'))
  assert.equal(result.details[0].references[0].quote, row.interaction_description)
  assert(result.details.every(d => d.verdict !== 'safe' && d.verdict !== 'danger'))
})

test('drug-only general food advice is not a coffee or milk reference', () => {
  assert.deepEqual(findEvidence('Test medicine', '커피', ['test ingredient'], [{ ...row, interaction_description: 'Take with or without food.' }]), [])
  assert.deepEqual(findEvidence('Test medicine', '우유', ['test ingredient'], [row]), [])
})

test('food names are not inferred from nutrients or substrings', () => {
  assert.deepEqual(findEvidence('Test medicine', '커피', ['test ingredient'], [{ ...row, interaction_description: 'Synthetic caffeine note.' }]), [])
  assert.deepEqual(findEvidence('Test medicine', '바나나', ['test ingredient'], [{ ...row, interaction_description: 'Synthetic potassium note.' }]), [])
  assert.deepEqual(findEvidence('Test medicine', '우유', ['test ingredient'], [{ ...row, interaction_description: 'Synthetic milky note.' }]), [])
})

test('wrong drug and unapproved dataset rows are excluded', () => {
  assert.deepEqual(findEvidence('Test medicine', '커피', ['other ingredient'], [row]), [])
  assert.deepEqual(findEvidence('Test medicine', '커피', ['test ingredient'], [{ ...row, dataset_sha256: 'unverified' }]), [])
})

test('duplicate retrieved rows do not inflate evidence counts', () => {
  assert.equal(findEvidence('Test medicine', '커피', ['test ingredient'], [row, row]).length, 1)
})

test('product identity cannot borrow the first unrelated search result', () => {
  assert(sameProduct('알로시아', '알로시아정1밀리그램(피나스테리드)'))
  assert(sameProduct('타이레놀', '타이레놀정500밀리그람(아세트아미노펜)'))
  assert(!sameProduct('타이레놀', '어린이타이레놀현탁액'))
  assert(!sameProduct('타이레놀', '타이레놀콜드에스정'))
  assert(!sameProduct('정', '정'))
})
