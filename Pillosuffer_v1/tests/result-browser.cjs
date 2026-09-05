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
  verdict: 'danger', details: [{ drug: drugs[0].name, food: foods[0], verdict: 'danger',
    reason: '화면 점검을 위한 가상 결과입니다. 실제 약이나 음식에 대한 판단이 아닙니다.',
    source: '화면 점검용 긴 출처 ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ' }],
  disclaimer: '테스트 전용 가상 응답', checkedAt: '2026-09-06T00:00:00.000Z',
}

async function main() {
  fs.mkdirSync(artifacts, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const checks = []
  try {
    for (const scenario of ['success-320', 'success-1440', 'db-error', 'safety-error', 'invalid-result']) {
      const width = scenario === 'success-1440' ? 1440 : 320
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      // Local-only UI fixture: intercept every auth/analysis request; no real account is used.
      await context.route(`${authOrigin}/**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
      await context.addInitScript(({ cookieName, cookieValue, drugs, foods }) => {
        document.cookie = `${cookieName}=${cookieValue}; path=/; SameSite=Lax`
        sessionStorage.setItem('selectedDrugs', JSON.stringify(drugs))
        sessionStorage.setItem('foodList', JSON.stringify(foods))
        localStorage.setItem('pillosuffer-history', '{broken-json')
      }, { cookieName, cookieValue: `base64-${encode(session)}`, drugs, foods })
      let calls = 0
      let failSafety = scenario === 'safety-error'
      await context.route('**/api/mfds', route => route.fulfill({
        status: scenario === 'db-error' ? 500 : 200,
        contentType: 'application/json', body: JSON.stringify({ contraindications: [], edrugInfo: [], drugProfiles: [] }),
      }))
      await context.route('**/api/safety-check', route => {
        calls += 1
        return route.fulfill({ status: failSafety ? 503 : 200,
          contentType: 'application/json', body: JSON.stringify(scenario === 'invalid-result' ? { ...result, details: [] } : result) })
      })
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(base + '/result')
      console.log(JSON.stringify({ scenario, phase: 'loaded' }))
      if (scenario.startsWith('success')) {
        await page.getByRole('heading', { name: '검사 결과', exact: true }).waitFor()
        await page.getByText(result.details[0].reason, { exact: true }).waitFor()
        assert.equal(calls, 1, 'Unchanged user must not trigger duplicate analysis')
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pillosuffer-history')).length), 1)
        assert.equal(await page.locator('a[href="tel:1399"]').count(), 0)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
        assert(!overflow, 'Result layout should fit viewport')
        await page.screenshot({ path: path.join(artifacts, `${width}-result.png`), fullPage: true })
        await page.getByRole('button', { name: '이전 기록', exact: true }).click()
        await page.getByText(drugs[0].name, { exact: false }).waitFor()
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
        if (scenario === 'db-error') assert.equal(calls, 0)
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
