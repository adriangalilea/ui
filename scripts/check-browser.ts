import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { existsSync } from "node:fs"
import { createServer } from "node:net"
import { chromium, webkit } from "playwright"

// Run against the production build by default; BASE_URL can target a running lab.
const reservation = createServer().listen(0, "127.0.0.1")
await once(reservation, "listening")
const address = reservation.address()
assert.ok(address && typeof address !== "string")
const port = address.port
await new Promise<void>((resolve) => reservation.close(() => resolve()))
const base = process.env.BASE_URL ?? `http://localhost:${port}`
const server = process.env.BASE_URL
  ? null
  : spawn("pnpm", ["next", "start", "--port", String(port)], { stdio: "pipe" })
let log = ""
server?.stderr.on("data", (data) => {
  log = (log + data).slice(-4000)
})
try {
  for (let n = 0; ; n++) {
    try {
      if ((await fetch(`${base}/lab/composition`)).ok) break
    } catch {}
    if (n > 120 || server?.exitCode != null)
      throw new Error(`Lab did not start: ${log}`)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  const metricRequest = (body: string, origin = base) =>
    fetch(`${base}/api/metrics`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body,
    })
  assert.equal(
    (
      await metricRequest(
        JSON.stringify({ metric: "installCopy", component: "telegram-chat" }),
      )
    ).status,
    202,
  )
  assert.equal(
    (
      await metricRequest(
        JSON.stringify({
          metric: "registryRequest",
          component: "telegram-chat",
        }),
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await metricRequest(
        JSON.stringify({ metric: "installCopy", component: "invented" }),
      )
    ).status,
    400,
  )
  assert.equal(
    (await metricRequest("{}", "https://foreign.example")).status,
    403,
  )
  assert.equal((await metricRequest("x".repeat(513))).status, 413)
  for (const engine of [chromium, webkit]) {
    const chrome =
      process.env.BROWSER_EXECUTABLE ??
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    const browser = await engine.launch({
      headless: true,
      ...(engine === chromium && existsSync(chrome)
        ? { executablePath: chrome }
        : {}),
    })
    try {
      for (const colorScheme of ["light", "dark"] as const) {
        const page = await browser.newPage({
          viewport: { width: 400, height: 850 },
          colorScheme,
          reducedMotion: "reduce",
        })
        const errors: string[] = []
        page.on("pageerror", (error) => errors.push(error.message))
        await page.goto(`${base}/lab/composition`)
        await page.locator("#ref-trigger").click()
        assert.equal(
          await page.locator("#ref-trigger").getAttribute("data-refs-agree"),
          "true",
          "Trigger composes both refs",
        )
        assert.equal(
          await page.getByRole("dialog").count(),
          0,
          "Consumer cancellation prevents opening",
        )
        assert.equal(
          await page
            .locator(".ag-code")
            .evaluate((el) => getComputedStyle(el).borderRadius),
          "0px",
          "Tailwind overrides component defaults",
        )
        await page.locator("#uncontrolled").focus()
        await page.keyboard.press("ArrowRight")
        await page.waitForFunction(
          () => document.querySelector("#observed")?.textContent === "Shape",
        )
        assert.match(
          await page
            .locator(
              '#uncontrolled [data-slot="card-gallery-card"]:not([inert])',
            )
            .innerText(),
          /Shape/,
        )
        await page.locator("#controlled").focus()
        await page.keyboard.press("End")
        assert.match(
          await page
            .locator('#controlled [data-slot="card-gallery-card"]:not([inert])')
            .innerText(),
          /Release/,
        )
        assert.ok(
          await page
            .locator("#narrow-picker")
            .evaluate(
              (el) => el.clientWidth <= 256 && el.scrollWidth > el.clientWidth,
            ),
        )
        await page.locator("#narrow-picker label").last().click()
        assert.ok(await page.locator("#narrow-picker input").last().isChecked())
        const viewport = await page
          .locator("#fixed-viewport .tgchat-view")
          .evaluate((el) => el.getBoundingClientRect().height)
        assert.ok(
          Math.abs(viewport - 320) < 1,
          `Container height must win: ${viewport}`,
        )
        assert.equal(
          await page
            .locator('#nested-scroll [data-edge="bottom"]')
            .evaluate((el) => getComputedStyle(el).opacity),
          "0",
        )
        await page.locator("#late-content").click()
        await page.waitForFunction(() => {
          const element = document.querySelector(
            '#nested-scroll [data-edge="bottom"]',
          )
          return element && getComputedStyle(element).opacity === "1"
        })
        await page.locator("#nested-scroll").evaluate((el) => {
          el.scrollTop = el.scrollHeight
        })
        await page.waitForFunction(() => {
          const element = document.querySelector(
            '#nested-scroll [data-edge="bottom"]',
          )
          return element && getComputedStyle(element).opacity === "0"
        })
        await page.evaluate(() => {
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: async () => {
                throw new Error("denied")
              },
            },
          })
        })
        await page.locator("#copy-composed").click()
        await page.waitForFunction(() =>
          document
            .querySelector("#copy-composed")
            ?.getAttribute("aria-label")
            ?.includes("failed"),
        )
        assert.equal(await page.locator("#clicks").innerText(), "1")
        await page.locator("#copy-cancelled").click()
        assert.equal(
          await page.locator("#copy-cancelled").getAttribute("aria-label"),
          "Copy",
        )
        const mutations = await page
          .locator("#hidden-chat")
          .evaluate(async (el) => {
            let count = 0
            const observer = new MutationObserver((records) => {
              count += records.length
            })
            observer.observe(el, {
              childList: true,
              subtree: true,
              characterData: true,
            })
            await new Promise((resolve) => setTimeout(resolve, 2200))
            observer.disconnect()
            return count
          })
        assert.equal(
          mutations,
          0,
          "Hidden completed chats have no decorative clock",
        )
        await page.emulateMedia({ reducedMotion: "no-preference" })
        await page.locator(".ag-stage-track").scrollIntoViewIfNeeded()
        const cancelled = await page
          .locator("#nested-scroll")
          .evaluate((el) => {
            const event = new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: 100,
            })
            el.dispatchEvent(event)
            return event.defaultPrevented
          })
        assert.equal(
          cancelled,
          false,
          "Timeline must not steal unrelated wheel input",
        )
        assert.deepEqual(errors, [])
        await page.emulateMedia({ reducedMotion: "no-preference" })
        await page.locator("#start-playback").click()
        await page.locator("#autoplay-check .tgchat[data-settled]").waitFor()
        await page.locator("#finish-progress").click()
        assert.match(
          await page
            .locator("#progress-check .tgchat-thread")
            .first()
            .innerText(),
          /A message that fits/,
        )
        await page.locator("#reverse-progress").click()
        assert.doesNotMatch(
          await page
            .locator("#progress-check .tgchat-thread")
            .first()
            .innerText(),
          /A message that fits/,
        )
        // A completed autoplay story stays complete after leaving and reentering.
        await page.evaluate(() => scrollTo(0, 0))
        await page.locator("#autoplay-check").scrollIntoViewIfNeeded()
        assert.equal(
          await page.locator("#autoplay-check .tgchat[data-settled]").count(),
          1,
        )
        await page.setViewportSize({ width: 1440, height: 1000 })
        await page.emulateMedia({ reducedMotion: "reduce" })
        await page.goto(`${base}/telegram-chat`)
        await page.evaluate(() =>
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: async () => {} },
          }),
        )
        const copyEvents: unknown[] = []
        await page.route("**/api/metrics", async (route) => {
          copyEvents.push(route.request().postDataJSON())
          await route.fulfill({ status: 202 })
        })
        const copyButton = page.locator(
          '[data-site-command="installCopy"] button',
        )
        const copied = page.waitForRequest("**/api/metrics")
        await copyButton.click()
        await copied
        assert.deepEqual(copyEvents, [
          { metric: "installCopy", component: "telegram-chat" },
        ])
        await page.evaluate(() =>
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: async () => {
                throw new Error("denied")
              },
            },
          }),
        )
        await copyButton.click()
        await page
          .locator(
            '[data-site-command="installCopy"] button[aria-label="Copy failed. Try again"]',
          )
          .waitFor()
        assert.equal(
          copyEvents.length,
          1,
          "Failed clipboard writes must not count",
        )
        const crop = page
          .locator('[data-slot="sample"]')
          .filter({ hasText: "04 · crop" })
        await crop.scrollIntoViewIfNeeded()
        await page.waitForFunction(() => {
          const sample = [
            ...document.querySelectorAll('[data-slot="sample"]'),
          ].find((node) => node.textContent?.includes("04 · crop"))
          const viewport = sample?.querySelector(".tgchat-view")
          return (
            viewport &&
            viewport.scrollHeight > viewport.clientHeight &&
            Math.abs(
              viewport.scrollTop -
                (viewport.scrollHeight - viewport.clientHeight),
            ) < 2
          )
        })
        await page.close()
        console.log(
          `${engine.name()} ${colorScheme}: composition invariants passed`,
        )
      }
    } finally {
      await browser.close()
    }
  }
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM")
    await once(server, "exit")
  }
}
