const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const base = process.env.BASE_URL || 'http://localhost:3007'
const artifacts = process.env.QA_ARTIFACTS || '/tmp/pillosuffer-qa'
const name = 'QA-only medicine ABCDEFGHIJKLMNOPQRSTUVWXYZ'

async function main() {
  fs.mkdirSync(artifacts, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 740 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('dialog', dialog => dialog.accept())
    const button = label => page.getByRole('button', { name: label, exact: true })
    const textbox = label => page.getByRole('textbox', { name: label, exact: true })

    await page.goto(base + '/food')
    await page.getByText('복용 중인 약을 먼저 등록하세요', { exact: true }).waitFor()
    await button('우유').click()
    assert(await button('안전 확인하기').isDisabled(), 'No medication must block analysis')

    await page.goto(base + '/manual')
    await textbox('약 이름').fill(name)
    await button('약 추가하기').click()
    await page.waitForURL('**/drugs')
    await button('수정').click()
    await textbox('약 이름').fill('   ')
    assert(await button('저장').isDisabled(), 'Whitespace name must block save')
    assert(await button('저장하고 다음으로').isDisabled(), 'Unfinished edit must block next step')
    await button('취소').click()
    await button('저장하고 다음으로').click()
    await page.waitForURL('**/food')
    await page.getByRole('checkbox', { name, exact: true }).waitFor()
    assert(await page.getByRole('checkbox', { name, exact: true }).isChecked())
    assert(await button('우유 삭제').isVisible(), 'Food draft should survive medication registration')
    await button('안전 확인하기').click()
    await page.waitForURL('**/login?next=%2Fresult')
    await button('닫기').click()
    await page.waitForURL('**/food')
    await button('우유 삭제').waitFor()
    assert(await button('우유 삭제').isVisible(), 'Login return should preserve food')
    assert(await page.getByRole('checkbox', { name, exact: true }).isChecked())
    await page.getByRole('checkbox', { name, exact: true }).uncheck()
    assert(await button('안전 확인하기').isDisabled())

    await textbox('식품명 검색 또는 직접 입력').fill('QA long food ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    await textbox('식품명 검색 또는 직접 입력').press('Enter')
    await button('QA long food ABCDEFGHIJKLMNOPQRSTUVWXYZ 삭제').waitFor()
    await page.reload()
    await button('QA long food ABCDEFGHIJKLMNOPQRSTUVWXYZ 삭제').waitFor()
    assert(!(await page.getByRole('checkbox', { name, exact: true }).isChecked()), 'Deselected medication must stay deselected')

    // Every context is disposable and contains only the synthetic records above.
    const measurements = []
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of ['/', '/my-meds', '/profile', '/food', '/manual', '/scan', '/login?next=%2Fresult']) {
        await page.goto(base + route)
        await page.getByRole('heading', { level: 1 }).waitFor()
        await page.evaluate(() => document.fonts.ready)
        const layout = await page.evaluate(() => {
          const controls = [...document.querySelectorAll('button, input:not([type="file"]), select, textarea')]
          const offscreen = controls.filter(el => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1)
          }).map(el => el.getAttribute('aria-label') || el.textContent)
          const close = document.querySelector('[aria-label="닫기"]')
          const r = close?.getBoundingClientRect()
          const closeClear = !r || close.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, offscreen, closeClear }
        })
        assert(layout.scrollWidth <= width + 1, `Page overflow: ${route} at ${width}`)
        assert.deepEqual(layout.offscreen, [], `Control overflow: ${route} at ${width}`)
        assert(layout.closeClear, 'Close button must not be covered')
        measurements.push({ route, ...layout })
        if (width === 320 || width === 1440) {
          const slug = route === '/' ? 'home' : route.split('?')[0].slice(1)
          await page.screenshot({ path: path.join(artifacts, `${width}-${slug}.png`), fullPage: true })
        }
      }
    }
    await page.goto(base + '/my-meds')
    await button('저장된 약 전체 삭제').click()
    await page.getByText('저장된 약이 없어요', { exact: true }).first().waitFor()
    await page.goto(base + '/food')
    await page.getByText('복용 중인 약을 먼저 등록하세요', { exact: true }).waitFor()
    assert(await button('안전 확인하기').isDisabled(), 'Deleted medication must not survive as a stale selection')
    assert.deepEqual(errors, [], 'Browser runtime errors')
    fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify({ base, flow: 'passed', measurements, errors }, null, 2))
    console.log(JSON.stringify({ base, flow: 'passed', responsiveChecks: measurements.length, screenshots: 14, errors, artifacts }))
  } finally {
    await browser.close()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
