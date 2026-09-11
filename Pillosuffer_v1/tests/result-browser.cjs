const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const base = 'http://localhost:3007'
const artifacts = '/tmp/pillosuffer-qa'
const authOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
const cookieName = `sb-${new URL(authOrigin).hostname.split('.')[0]}-auth-token`
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'qa@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const expiry = Math.floor(Date.now() / 1000) + 3600
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expiry, aud: 'authenticated', role: 'authenticated' })}.test-signature`
const session = { access_token: token, refresh_token: 'synthetic-test-only', token_type: 'bearer', expires_in: 3600, expires_at: expiry, user }
const drugs = [{ name: '검증용긴약품명 ABCDEFGHIJKLMNOPQRSTUVWXYZ' }]
const foods = ['검증용긴식품명 ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const result = {
  mode: 'retrieval-only-v1',
  verdict: 'caution', details: [{ drug: drugs[0].name, food: foods[0], verdict: 'caution',
    evidenceStatus: 'missing', references: [],
    reason: '화면 점검을 위한 가상 결과입니다. 실제 약이나 음식에 대한 판단이 아닙니다.',
    source: '화면 점검용 긴 출처 ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ' }],
  disclaimer: '테스트 전용 가상 응답', checkedAt: '2026-09-06T00:00:00.000Z',
}
const legacy = { id: 'legacy', drugs, foods, result: { ...result, mode: undefined, verdict: 'safe',
  details: [{ drug: drugs[0].name, food: foods[0], verdict: 'safe', reason: 'Legacy AI fixture', source: 'AI 일반 의학 지식' }] } }

async function main() {
  fs.mkdirSync(artifacts, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const checks = []
  try {
    for (const scenario of ['success-found-320', 'success-missing-320', 'success-mixed-320',
      'success-found-1440', 'success-missing-1440', 'success-mixed-1440', 'db-error', 'safety-error', 'invalid-result']) {
      const width = scenario.endsWith('1440') ? 1440 : 320
      const status = scenario.startsWith('success') ? scenario.split('-')[1] : 'missing'
      const scenarioFoods = status === 'mixed' ? [...foods, 'Second test food'] : foods
      const scenarioResult = { ...result, details: scenarioFoods.map((food, index) => {
        const found = index === 0 && status !== 'missing'
        return { ...result.details[0], food, evidenceStatus: found ? 'found' : 'missing',
          references: found ? [{ id: 'synthetic-test-reference', drug: drugs[0].name, food,
            matchedDrug: 'Synthetic ingredient', matchedTerm: 'Synthetic food',
            quote: 'Synthetic reference text for layout testing, not medical guidance.',
            source: 'Test archive', citation: 'Test reference',
            datasetSha256: '8078106b88873f4e8c8b6656cf933a933d9fc29b6c8bf3427f6b81ec3ee9b17c' }] : [] }
      }) }
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      // Local-only UI fixture: intercept every auth/analysis request; no real account is used.
      await context.route(`${authOrigin}/**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
      await context.addInitScript(({ cookieName, cookieValue, drugs, foods, legacy }) => {
        document.cookie = `${cookieName}=${cookieValue}; path=/; SameSite=Lax`
        sessionStorage.setItem('selectedDrugs', JSON.stringify(drugs))
        sessionStorage.setItem('foodList', JSON.stringify(foods))
        localStorage.setItem('pillosuffer-history', legacy ? JSON.stringify([legacy]) : '{broken-json')
      }, { cookieName, cookieValue: `base64-${encode(session)}`, drugs, foods: scenarioFoods, legacy: scenario.startsWith('success') ? legacy : null })
      let calls = 0
      let failSafety = scenario === 'safety-error'
      await context.route('**/api/mfds', route => route.fulfill({
        status: scenario === 'db-error' ? 500 : 200,
        contentType: 'application/json', body: JSON.stringify({ contraindications: [], edrugInfo: [], drugProfiles: [] }),
      }))
      await context.route('**/api/safety-check', route => {
        calls += 1
        return route.fulfill({ status: failSafety || scenario === 'db-error' ? 503 : 200,
          contentType: 'application/json', body: JSON.stringify(scenario === 'db-error' ? { code: 'EVIDENCE_UNAVAILABLE' } :
            scenario === 'invalid-result' ? { ...result, details: [] } : scenarioResult) })
      })
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(base + '/result')
      console.log(JSON.stringify({ scenario, phase: 'loaded' }))
      if (scenario.startsWith('success')) {
        try {
          await page.getByRole('heading', { name: '검사 결과', exact: true }).waitFor()
        } catch (error) {
          await page.screenshot({ path: path.join(artifacts, `debug-${scenario}.png`), fullPage: true })
          console.log(JSON.stringify({ scenario, path: new URL(page.url()).pathname, body: await page.locator('body').innerText(), errors, calls }))
          throw error
        }
        await page.getByText(result.details[0].reason, { exact: true }).first().waitFor()
        assert.equal(calls, 1, 'Unchanged user must not trigger duplicate analysis')
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pillosuffer-history')).length), 2)
        assert.equal(await page.locator('a[href="tel:1399"]').count(), 0)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
        assert(!overflow, 'Result layout should fit viewport')
        assert.equal(await page.getByText('양호', { exact: true }).count(), 0)
        assert.equal(await page.getByText('AI 추론', { exact: true }).count(), 0)
        const card = page.getByText(result.details[0].reason, { exact: true }).first().locator('../..')
        const frame = await card.evaluate(element => {
          const style = getComputedStyle(element)
          const content = getComputedStyle(element.querySelector('p').parentElement.parentElement)
          return {
            bars: [...element.children].filter(child => getComputedStyle(child).position === 'absolute').length,
            borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
            padding: [content.paddingLeft, content.paddingRight],
            background: style.backgroundColor,
            badgeBackground: getComputedStyle(element.querySelector('span')).backgroundColor,
            badgeText: getComputedStyle(element.querySelector('span')).color,
          }
        })
        await page.screenshot({ path: path.join(artifacts, `${scenario}.png`), fullPage: true })
        assert.equal(frame.bars, 0, 'Result cards must not have decorative side bars')
        assert(frame.borders.every(border => border === frame.borders[0]), 'Result card borders must be uniform')
        assert.equal(frame.padding[0], frame.padding[1], 'Result card padding must be balanced')
        assert.equal(frame.background, status === 'missing' ? 'rgb(255, 251, 235)' : 'rgb(239, 246, 255)', 'Evidence states must retain distinct colored surfaces')
        assert.equal(frame.badgeBackground, status === 'missing' ? 'rgb(180, 83, 9)' : 'rgb(29, 78, 216)')
        assert.equal(frame.badgeText, 'rgb(255, 255, 255)', 'Status pills must keep legible contrast')
        await page.getByRole('button', { name: '이전 기록', exact: true }).click()
        await page.getByText(drugs[0].name, { exact: false }).first().waitFor()
        await page.getByText('재확인 필요', { exact: true }).waitFor()
        assert.equal(await page.getByText('양호', { exact: true }).count(), 0)
      } else {
        try {
          await page.getByRole('button', { name: '다시 시도', exact: true }).waitFor()
        } catch (error) {
          await page.screenshot({ path: path.join(artifacts, `debug-${scenario}.png`), fullPage: true })
          console.log(JSON.stringify({ scenario, url: page.url(), body: await page.locator('body').innerText(), errors, calls }))
          throw error
        }
        assert.equal(await page.getByRole('heading', { name: '검사 결과', exact: true }).count(), 0)
        assert.equal(await page.evaluate(() => localStorage.getItem('pillosuffer-history')), '{broken-json', 'Failed analysis must not be saved')
        if (scenario === 'db-error') {
          assert.equal(calls, 1)
          await page.getByText(/근거 데이터가 확인되지 않아/).waitFor()
        }
        if (scenario === 'safety-error') {
          await page.screenshot({ path: path.join(artifacts, '320-result-error.png'), fullPage: true })
          const previousCalls = calls
          failSafety = false
          await page.getByRole('button', { name: '다시 시도', exact: true }).click()
          await page.getByRole('heading', { name: '검사 결과', exact: true }).waitFor()
          assert.equal(calls, previousCalls + 1)
        }
      }
      assert.deepEqual(errors, [])
      checks.push({ scenario, passed: true, calls })
      console.log(JSON.stringify(checks[checks.length - 1]))
      await context.close()
    }
    fs.writeFileSync(path.join(artifacts, 'result-report.json'), JSON.stringify(checks, null, 2))
    console.log(JSON.stringify({ fixturesOnly: true, checks }))
  } finally {
    await browser.close()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
