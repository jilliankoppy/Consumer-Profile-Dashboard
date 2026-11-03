// Start npm run dev first; APP_URL and CHROMIUM_PATH may override the defaults.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (require("node:fs").existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.APP_URL || "http://localhost:5173/Consumer-Profile-Dashboard/",
  );
  await page
    .getByRole("heading", { name: "A little data. A whole universe." })
    .waitFor();
  await page.screenshot({ path: "/tmp/orbit-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Connect data", exact: true }).click();
  await page.getByRole("button", { name: /Import your records/ }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "qa-only.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([
        {
          url: "https://github.com",
          title: "software coding",
          timestamp: new Date().toISOString(),
        },
        {
          url: "https://github.com/project",
          title: "laptop software",
          timestamp: new Date().toISOString(),
        },
        {
          url: "https://example.com",
          title: "cooking recipe",
          timestamp: new Date().toISOString(),
        },
      ]),
    ),
  });
  await page.getByRole("status").waitFor();
  await page.getByRole("button", { name: "Interest universe NEW" }).click();
  await page
    .getByRole("heading", { name: "Your interests, interconnected." })
    .waitFor();
  await page
    .locator("svg g[role=button]")
    .filter({ hasText: "TECHNOLOGY" })
    .click();
  await page.getByRole("dialog", { name: "Supporting evidence" }).waitFor();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page
    .getByRole("button", { name: "Product discovery", exact: true })
    .click();
  await page
    .getByPlaceholder("https://retailer.com/product")
    .fill("https://example.com/laptop");
  await page.getByPlaceholder("Name from the product page").fill("QA laptop");
  await page.locator("form select").selectOption("Technology");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.getByRole("button", { name: /^Recommendations/ }).click();
  await page.getByText("QA laptop", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "AI vs. reality", exact: true })
    .click();
  await page
    .locator(".feedback-card")
    .filter({ hasText: "technology" })
    .getByRole("button", { name: "inaccurate", exact: true })
    .click();
  await page.getByRole("button", { name: /^Recommendations/ }).click();
  await page
    .getByRole("heading", { name: "Your next favorite needs a little context" })
    .waitFor();
  await page
    .getByRole("button", { name: "Data & privacy", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete record software coding", exact: true })
    .click();
  assert.equal(await page.locator(".record-table>div").count(), 2);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete all session data" }).click();
  await page
    .getByText("No records in this view. You decide what to connect.")
    .waitFor();
  await page
    .getByRole("button", { name: "Consumer overview", exact: true })
    .click();
  await page.reload();
  assert.equal(
    await page.locator(".stat-card>strong").first().innerText(),
    "0—",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: "/tmp/orbit-mobile.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile horizontal overflow",
  );
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("button", { name: "Digital footprint", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "The rhythm of your digital life." })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: import, network evidence, navigation, catalog, recommendations, feedback, record deletion, reset, refresh privacy, mobile layout. No browser errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
