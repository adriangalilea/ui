import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import type { Browser } from "playwright"

export async function checkImage(browser: Browser, base: string) {
  const body = readFileSync(
    new URL("../public/glass-river.jpg", import.meta.url),
  )
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const page = await browser.newPage({
      viewport: { width: 400, height: 800 },
      reducedMotion,
    })
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route("**/image-test.jpg", async (route) => {
      await pending
      await route.fulfill({ body, contentType: "image/jpeg" })
    })
    await page.route("**/image-next.jpg", (route) =>
      route.fulfill({ status: 404 }),
    )
    await page.goto(`${base}/lab/image`, { waitUntil: "domcontentloaded" })
    const frame = page.locator('[data-slot="image"]')
    const img = frame.locator('[data-slot="image-content"]')
    const before = await frame.boundingBox()
    const afterText = await page.locator("#after-image").boundingBox()
    assert.ok(before && before.height > 200)
    assert.equal(await img.evaluate((el) => getComputedStyle(el).opacity), "0")
    assert.equal(await frame.getAttribute("data-state"), "loading")
    release()
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-slot="image"]')
          ?.getAttribute("data-state") === "ready",
    )
    await page.waitForTimeout(350)
    assert.deepEqual(
      await frame.boundingBox(),
      before,
      "Loading must not move the frame",
    )
    assert.deepEqual(
      await page.locator("#after-image").boundingBox(),
      afterText,
      "Loading must not shift subsequent content",
    )
    assert.equal(await img.evaluate((el) => getComputedStyle(el).opacity), "1")
    assert.equal(
      await img.evaluate((el) => getComputedStyle(el).filter),
      "none",
    )
    if (reducedMotion === "reduce")
      assert.equal(
        await img.evaluate((el) => getComputedStyle(el).transitionProperty),
        "none",
      )
    await page.getByRole("button", { name: "change source" }).click()
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-slot="image"]')
          ?.getAttribute("data-state") === "error",
    )
    assert.deepEqual(
      await frame.boundingBox(),
      before,
      "An error must keep the reserved space",
    )
    assert.equal(await img.getAttribute("alt"), "Test landscape")
    await page.close()
  }
  const page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 400, height: 800 },
  })
  await page.route("**/image-test.jpg", (route) =>
    route.fulfill({ body, contentType: "image/jpeg" }),
  )
  await page.goto(`${base}/lab/image`)
  assert.equal(
    await page
      .locator('[data-slot="image-content"]')
      .evaluate((el) => getComputedStyle(el).opacity),
    "1",
    "No-JS must still show the image",
  )
  await page.close()
  const cached = await browser.newPage()
  let releaseScripts!: () => void
  const scripts = new Promise<void>((resolve) => {
    releaseScripts = resolve
  })
  await cached.route("**/_next/**/*.js", async (route) => {
    await scripts
    await route.continue()
  })
  await cached.route("**/image-test.jpg", (route) =>
    route.fulfill({ body, contentType: "image/jpeg" }),
  )
  await cached.goto(`${base}/lab/image`, { waitUntil: "commit" })
  await cached.waitForFunction(() => {
    const img = document.querySelector("main img") as HTMLImageElement | null
    return img?.complete && img.naturalWidth > 0
  })
  releaseScripts()
  await cached.waitForFunction(
    () =>
      document
        .querySelector('[data-slot="image"]')
        ?.getAttribute("data-state") === "ready",
  )
  await cached.close()

  const lightbox = await browser.newPage({
    viewport: { width: 900, height: 800 },
  })
  await lightbox.goto(`${base}/lightbox`, { waitUntil: "domcontentloaded" })
  const preview = lightbox.locator('[data-slot="image"]').first()
  await preview.scrollIntoViewIfNeeded()
  await lightbox.waitForFunction(
    () =>
      document
        .querySelector('[data-slot="image"]')
        ?.getAttribute("data-state") === "ready",
  )
  const selected = await preview
    .locator('[data-slot="image-content"]')
    .evaluate((img) => (img as HTMLImageElement).currentSrc)
  assert.ok(
    selected.includes("/_next/image?"),
    "The demo uses responsive Next optimization",
  )
  await preview.locator("..").click()
  const baseImage = lightbox.locator(".ag-lb-layer[data-active] .ag-lb-base")
  await baseImage.waitFor({ state: "visible" })
  assert.equal(
    await baseImage.getAttribute("src"),
    selected,
    "The lightbox starts with the rendition already loaded on the page",
  )
  await lightbox.keyboard.press("Escape")
  await lightbox.close()
  console.log(
    "✓ image: delayed decode, reserved layout, source replacement, errors, reduced motion, no JS, pre-hydration cache, lightbox rendition",
  )
}
