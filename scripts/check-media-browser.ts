import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
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
  const video = page.locator('video[aria-label="test preview"]')
  await page.waitForFunction(() =>
    document.querySelector('video[data-forwarded-ref="yes"]'),
  )
  const preview = page.locator('[data-slot="video"]').filter({ has: video })
  assert.equal(
    await page
      .locator('[data-slot="video"]')
      .filter({ has: page.locator('video[aria-label="plain preview"]') })
      .getByRole("button")
      .count(),
    0,
    "cover controls must be opt-in",
  )
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
    "rapid reentry keeps playing",
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
  await page.unroute("**/media-upload-test")
  let finishToolbar!: () => void
  await page.route("**/media-upload-test", async (route) => {
    await new Promise<void>((resolve) => {
      finishToolbar = resolve
    })
    await route.fulfill({
      json: {
        src: "/image-test.jpg",
        kind: "image",
        width: 800,
        height: 533,
        mime: "image/jpeg",
        bytes: 10,
      },
    })
  })
  await editor.focus()
  await page.keyboard.press("Control+Meta+i")
  await page.locator('input[type="file"]').setInputFiles({
    name: "toolbar.png",
    mimeType: "image/png",
    buffer: Buffer.from("fixture"),
  })
  await page.getByRole("list", { name: "Image uploads" }).waitFor()
  await page.getByRole("button", { name: "publish", exact: true }).click()
  assert.equal(
    await page.locator("#submits").textContent(),
    "2",
    "toolbar upload also blocks publishing",
  )
  finishToolbar()
  await page
    .getByRole("list", { name: "Image uploads" })
    .waitFor({ state: "detached" })
  assert.equal(
    await page.locator('input[name="src"]').inputValue(),
    "/image-test.jpg",
  )
  assert.deepEqual(errors, [])
  await page.close()
  const reduced = await browser.newPage({ reducedMotion: "reduce" })
  await reduced.goto(`${base}/lab/media`)
  await reduced.locator('[data-slot="video"]').first().hover()
  await reduced.waitForTimeout(400)
  assert.equal(
    await reduced
      .locator('video[aria-label="test preview"]')
      .evaluate((v) => (v as HTMLVideoElement).paused),
    true,
  )
  await reduced.getByRole("button", { name: "Play test preview" }).click()
  await reduced.waitForFunction(() => !document.querySelector("video")?.paused)
  await reduced.close()
  const dir = mkdtempSync(join(tmpdir(), "playback-check-"))
  const playback = await browser.newPage({
    viewport: { width: 900, height: 1000 },
  })
  try {
    const clip = join(dir, "short.mp4")
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-i",
      "public/bunny.mp4",
      "-t",
      "0.5",
      "-vf",
      "scale=160:-2",
      "-an",
      clip,
    ])
    await playback.route("**/bunny.mp4?once", (route) =>
      route.fulfill({ body: readFileSync(clip), contentType: "video/mp4" }),
    )
    await playback.goto(`${base}/lab/media`)
    const once = playback.locator('video[aria-label="once preview"]')
    await once.scrollIntoViewIfNeeded()
    await playback.waitForFunction(
      () =>
        (
          document.querySelector(
            'video[aria-label="once preview"]',
          ) as HTMLVideoElement
        )?.ended,
    )
    await playback.waitForTimeout(650)
    assert.equal(
      await once.evaluate((v) => (v as HTMLVideoElement).ended),
      true,
      "arrival holds the final frame",
    )
    await once.hover()
    await playback.waitForFunction(() => {
      const v = document.querySelector(
        'video[aria-label="once preview"]',
      ) as HTMLVideoElement
      return v && !v.paused && v.loop
    })
    await playback.waitForTimeout(1200)
    assert.equal(
      await once.evaluate((v) => (v as HTMLVideoElement).paused),
      false,
      "hover keeps looping beyond clip duration",
    )
    await playback.mouse.move(1, 1)
    await playback.waitForFunction(
      () =>
        (
          document.querySelector(
            'video[aria-label="once preview"]',
          ) as HTMLVideoElement
        )?.paused,
    )
    await once.hover()
    await playback.waitForFunction(
      () =>
        !(
          document.querySelector(
            'video[aria-label="once preview"]',
          ) as HTMLVideoElement
        )?.paused,
    )
    await playback.getByRole("img", { name: "portal landscape" }).click()
    await playback.locator('.ag-lb[data-phase="idle"]').waitFor()
    const clicks = await playback.locator("#card-clicks").textContent()
    await playback.mouse.click(10, 500)
    await playback.locator(".ag-lb").waitFor({ state: "detached" })
    assert.equal(
      await playback.locator("#card-clicks").textContent(),
      clicks,
      "dismiss must not activate the containing card",
    )
    const animation = playback.locator('[data-slot="image-animation"]')
    await animation.scrollIntoViewIfNeeded()
    await animation.focus()
    await playback.waitForFunction(
      () =>
        document
          .querySelector('[data-slot="image-animation"]')
          ?.getAttribute("data-playing") === "true",
    )
  } finally {
    await playback.close()
    rmSync(dir, { recursive: true, force: true })
  }
  console.log(
    "✓ media browser: rapid hover, pause intent, reduced motion/manual playback, pending upload, mapped insertion, retry and cancellation",
  )
}
