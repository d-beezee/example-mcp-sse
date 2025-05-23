import { AxeBuilder } from "@axe-core/playwright";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

export async function scanViolations(
  url: string,
  violationsTag: string[],
  viewport = { width: 1920, height: 1080 },
  shouldRunInHeadless = true
) {
  console.log("Starting accessibility scan...");
  console.log(`URL: ${url}`);
  console.log(`Viewport: ${JSON.stringify(viewport)}`);
  console.log(`Headless: ${shouldRunInHeadless}`);
  console.log(`Violations Tag: ${JSON.stringify(violationsTag)}`);
  console.log("-------------------------------------");
  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: shouldRunInHeadless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    timeout: 60000,
  });
  console.log("-------------------------------------");

  console.log("Creating new context...");
  const context = await browser.newContext({
    viewport,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  console.log("-------------------------------------");

  console.log("Opening new page...");
  const page = await context.newPage();
  await page.goto(url);
  console.log("-------------------------------------");

  console.log("Running accessibility scan...");
  const axe = violationsTag.length
    ? new AxeBuilder({ page }).withTags(violationsTag)
    : new AxeBuilder({ page });
  console.log("-------------------------------------");

  console.log("Analyzing results...");
  const results = await axe.analyze();
  console.log("-------------------------------------");

  let reportCounter = 1;
  const report = [];

  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      report.push({
        index: reportCounter++,
        element: node.target[0],
        impactLevel: violation.impact,
        description: violation.description,
        wcagCriteria: violation.tags?.join(", "),
      } satisfies accessibilityResult);
    }
  }

  const filePath = path.join(
    path.join(os.homedir(), "Downloads"),
    `a11y-report-${Date.now()}.png`
  );

  const screenshots = [];

  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      const element = node.target[0];
      const selector = Array.isArray(element) ? element.join(" ") : element;

      const screenshot = await page.locator(selector).screenshot({
        path: filePath,
        quality: 40,
        type: "jpeg",
      });

      screenshots.push({
        element: selector,
        screenshot: screenshot.toString("base64"),
      });
    }
  }

  await browser.close();

  return { report, screenshots };
}

type accessibilityResult = {
  index: number;
  element: any;
  impactLevel: any;
  description: string;
  wcagCriteria: string;
};
