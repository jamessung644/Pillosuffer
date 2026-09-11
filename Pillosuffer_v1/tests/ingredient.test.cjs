const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename)
const originalFetch = global.fetch
const originalKey = process.env.MFDS_API_KEY
afterEach(() => {
  global.fetch = originalFetch
  if (originalKey === undefined) delete process.env.MFDS_API_KEY
  else process.env.MFDS_API_KEY = originalKey
})
function resolver(items, totalCount = items.length) {
  process.env.MFDS_API_KEY = 'synthetic-test-only'
  delete require.cache[require.resolve('../lib/ingredient.ts')]
  global.fetch = async input => {
    const url = new URL(String(input))
    assert.equal(url.hostname, 'apis.data.go.kr', 'Ingredient resolution must not use an LLM')
    const limit = Number(url.searchParams.get('numOfRows'))
    return Response.json({ header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' },
      body: { totalCount, pageNo: 1, numOfRows: limit, items: items.slice(0, limit) } })
  }
  return require('../lib/ingredient.ts').resolveIngredient
}

test('official matching product is selected even when the first hit is a different product', async () => {
  const resolve = resolver([
    { ITEM_NAME: '어린이타이레놀산160밀리그램(아세트아미노펜)', ITEM_INGR_NAME: 'Acetaminophen Granules' },
    { ITEM_NAME: '타이레놀정500밀리그람(아세트아미노펜)', ITEM_INGR_NAME: 'Acetaminophen' },
    { ITEM_NAME: '타이레놀콜드-에스정', ITEM_INGR_NAME: 'Acetaminophen/Other synthetic ingredient' },
  ])
  const result = await resolve('타이레놀')
  assert.equal(result.itemName, '타이레놀정500밀리그람(아세트아미노펜)')
  assert.deepEqual(result.eng, ['acetaminophen'])
})

test('unrelated product hits cannot supply ingredients', async () => {
  const resolve = resolver([{ ITEM_NAME: '어린이타이레놀현탁액', ITEM_INGR_NAME: 'Acetaminophen' }])
  assert.equal(await resolve('타이레놀'), null)
})

test('matching product names with conflicting ingredients remain unresolved', async () => {
  const resolve = resolver([
    { ITEM_NAME: '검증약정10밀리그램', ITEM_INGR_NAME: 'Fixtureone' },
    { ITEM_NAME: '검증약정20밀리그램', ITEM_INGR_NAME: 'Fixturetwo' },
  ])
  assert.equal(await resolve('검증약'), null)
})

test('different strengths with the same official ingredients can resolve', async () => {
  const resolve = resolver([
    { ITEM_NAME: '검증약정10밀리그램', ITEM_INGR_NAME: 'Fixtureone' },
    { ITEM_NAME: '검증약정20밀리그램', ITEM_INGR_NAME: 'Fixtureone' },
  ])
  assert.deepEqual((await resolve('검증약')).eng, ['fixtureone'])
})

test('truncated official result sets do not silently choose a product', async () => {
  const resolve = resolver([{ ITEM_NAME: '검증약정', ITEM_INGR_NAME: 'Fixtureone' }], 101)
  assert.equal(await resolve('검증약'), null)
})
