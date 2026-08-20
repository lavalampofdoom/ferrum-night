import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] || "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("text=Walk the road", { timeout: 45000 });
await page.screenshot({ path: "/workspace/screenshots/title.png" });
await page.click("text=Walk the road");
await page.waitForTimeout(1200);
await page.screenshot({ path: "/workspace/screenshots/gameplay.png" });

const before = await page.evaluate(() => window.__controlsTest?.getPos());
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyA"]));
await page.waitForTimeout(600);
const afterA = await page.evaluate(() => window.__controlsTest?.getPos());
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyD"]));
await page.waitForTimeout(600);
const afterD = await page.evaluate(() => window.__controlsTest?.getPos());
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyW"]));
await page.waitForTimeout(400);
const afterW = await page.evaluate(() => window.__controlsTest?.getPos());
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.keyboard.press("KeyE");
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/gameplay-action.png" });

const loc = await page.locator("p.font-display").first().textContent();
console.log(JSON.stringify({ errors, before, afterA, afterD, afterW, loc }, null, 2));
await browser.close();
if (errors.length) process.exit(1);
