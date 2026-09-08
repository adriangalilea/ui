import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import type { Browser } from "playwright"

export async function checkMediaBrowser(browser: Browser, base: string) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } })
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  let release = () => {}
  await page.route("**/media-upload-test", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route.fulfill({
      json: {
        src: "/image-test.jpg",
        kind: "image",
        width: 800,
        height: 533,
        mime: "image/jpeg",
        bytes: 1234,
      },
    })
  })
  await page.route("**/image-test.jpg", (route) =>
    route.fulfill({
      body: readFileSync("public/glass-river.jpg"),
      contentType: "image/jpeg",
    }),
  )
  await page.goto(`${base}/lab/media`)
  const video = page.locator("video")
  const preview = page.locator('[data-slot="video"]')
  await preview.hover()
  await page.waitForFunction(() => {
    const v = document.querySelector("video")
    return v && !v.paused && v.currentTime > 0.05
  })
  await page.mouse.move(1, 1)
  await preview.hover()
  await page.waitForTimeout(400)
  assert.equal(
    await video.evaluate((v) => (v as HTMLVideoElement).paused),
    false,
    "rapid reentry must not be paused by an old callback",
  )
  await page.getByRole("button", { name: "Pause test preview" }).click()
  await page.waitForTimeout(100)
  assert.equal(
    await video.evaluate((v) => (v as HTMLVideoElement).paused),
    true,
  )
  await page.mouse.move(1, 1)
  await preview.hover()
  assert.equal(
    await video.evaluate((v) => (v as HTMLVideoElement).paused),
    true,
    "respect explicit pause",
  )
  const editor = page.locator('[contenteditable="true"]')
  await editor.waitFor()
  await editor.evaluate((el) => {
    const text = el.querySelector("p")?.firstChild
    if (!text) throw new Error("Missing initial text")
    const range = document.createRange()
    range.setStart(text, 0)
    range.collapse(true)
    getSelection()?.removeAllRanges()
    getSelection()?.addRange(range)
  })
  await page.waitForTimeout(100)
  await editor.evaluate((el) => {
    const data = new DataTransfer()
    data.items.add(new File(["fixture"], "test.png", { type: "image/png" }))
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await page.getByRole("list", { name: "Image uploads" }).waitFor()
  await page.getByRole("button", { name: "publish" }).click()
  assert.equal(
    await page.locator("#submits").textContent(),
    "0",
    "pending uploads block publish",
  )
  await editor.evaluate((el) => {
    el.focus()
    const text = el.querySelector("p:last-child")?.firstChild
    if (!text) throw new Error("Missing final paragraph")
    const range = document.createRange()
    range.setStart(text, text.textContent?.length ?? 0)
    range.collapse(true)
    getSelection()?.removeAllRanges()
    getSelection()?.addRange(range)
  })
  await page.waitForTimeout(100)
  await page.keyboard.type(" typed while uploading")
  release()
  await editor.locator("img").waitFor()
  assert.ok(
    await editor.evaluate((el) => {
      const img = el.querySelector("img")
      const last = [...el.querySelectorAll("p")].find((p) =>
        p.textContent?.includes("typed while uploading"),
      )
      return (
        img &&
        last &&
        !!(img.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING)
      )
    }),
    `upload must land at the original position, before later typing: ${await editor.innerHTML()}`,
  )
  await page.getByRole("button", { name: "publish" }).click()
  assert.equal(await page.locator("#submits").textContent(), "1")
  assert.equal(
    await page
      .getByText("Finish or cancel image uploads before publishing.")
      .count(),
    0,
    "completed uploads clear the publish warning",
  )
  await page.unroute("**/media-upload-test")
  let attempts = 0
  await page.route("**/media-upload-test", async (route) => {
    attempts++
    if (attempts === 1) {
      await route.fulfill({ status: 503, json: { error: "Try again" } })
      return
    }
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route
      .fulfill({
        json: {
          src: "/image-test.jpg",
          kind: "image",
          width: 800,
          height: 533,
          mime: "image/jpeg",
          bytes: 1234,
        },
      })
      .catch(() => {}) // Cancellation may already have closed this request.
  })
  await editor.evaluate((el) => {
    const data = new DataTransfer()
    data.items.add(new File(["fixture"], "retry.png", { type: "image/png" }))
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await page.getByRole("button", { name: "retry", exact: true }).click()
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Image uploads"] progress'),
  )
  await page.getByRole("button", { name: "cancel", exact: true }).click()
  release()
  await page.waitForTimeout(200)
  assert.equal(
    await editor.locator("img").count(),
    1,
    "cancelled retry must never insert an image",
  )
  assert.equal(
    await page.getByRole("list", { name: "Image uploads" }).count(),
    0,
  )
  await page.getByRole("button", { name: "publish" }).click()
  assert.equal(await page.locator("#submits").textContent(), "2")
  assert.deepEqual(errors, [])
  await page.close()
  const reduced = await browser.newPage({ reducedMotion: "reduce" })
  await reduced.goto(`${base}/lab/media`)
  await reduced.locator('[data-slot="video"]').hover()
  await reduced.waitForTimeout(400)
  assert.equal(
    await reduced
      .locator("video")
      .evaluate((v) => (v as HTMLVideoElement).paused),
    true,
  )
  await reduced.getByRole("button", { name: "Play test preview" }).click()
  await reduced.waitForFunction(() => !document.querySelector("video")?.paused)
  await reduced.close()
  console.log(
    "✓ media browser: rapid hover, pause intent, reduced motion/manual playback, pending upload, mapped insertion, retry and cancellation",
  )
}
