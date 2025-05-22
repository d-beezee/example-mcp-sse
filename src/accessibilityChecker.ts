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

  await page.addStyleTag({
    content: `
        .a11y-violation {
            position: relative !important;
            outline: 4px solid #FF4444 !important;
            margin: 2px !important;
        }
        .violation-number {
            position: absolute !important;
            top: -12px !important;
            left: -12px !important;
            background: #FF4444;
            color: white !important;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex !important;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            z-index: 10000;
        }
        .a11y-violation-info {
            position: absolute !important;
            background: #333333 !important;
            color: white !important;
            padding: 12px !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            max-width: 300px !important;
            z-index: 9999 !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
    `,
  });

  console.log("-------------------------------------");

  console.log("Running accessibility scan...");
  const axe = violationsTag.length
    ? new AxeBuilder({ page }).withTags(violationsTag)
    : new AxeBuilder({ page });
  console.log("-------------------------------------");

  console.log("Analyzing results...");
  const results = await axe.analyze();
  console.log("-------------------------------------");
  let violationCounter = 1;

  console.log("Highlighting violations...");
  console.log(`Found ${results.violations.length} violations.`);
  for (const violation of results.violations) {
    console.log(`Violation: ${JSON.stringify(violation)}`);
    for (const node of violation.nodes) {
      try {
        const targetSelector = node.target[0];
        const selector = Array.isArray(targetSelector)
          ? targetSelector.join(" ")
          : targetSelector;

        await page.evaluate(
          ({ selector, violationData, counter }) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element) => {
              // Create number badge directly on the element
              const numberBadge = document.createElement("div");
              numberBadge.className = "violation-number";
              numberBadge.textContent = counter.toString();

              // Add violation styling
              element.classList.add("a11y-violation");
              element.appendChild(numberBadge);

              // Create info box
              const listItem = document.createElement("div");
              listItem.style.marginBottom = "15px";
              listItem.innerHTML = `
                    <div style="color: #FF4444; font-weight: bold;">
                        Violation #${counter}: ${violationData.impact!.toUpperCase()}
                    </div>
                    <div style="margin: 5px 0; font-size: 14px;">
                        ${violationData.description}
                    </div>
                `;

              // Position info box relative to element
              document.body.appendChild(listItem);
              const rect = element.getBoundingClientRect();
              listItem.style.left = `${rect.left + window.scrollX}px`;
              listItem.style.top = `${rect.bottom + window.scrollY + 10}px`;
            });
          },
          {
            selector: selector,
            violationData: {
              impact: violation.impact,
              description: violation.description,
            },
            counter: violationCounter,
          }
        );

        violationCounter++;
      } catch (error) {
        console.log(`Failed to highlight element: ${error}`);
      }
    }
  }

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

  const screenshot = await page.screenshot({
    path: filePath,
    fullPage: true,
  });

  const base64Screenshot = screenshot.toString("base64");

  await browser.close();

  return { report, base64Screenshot };
}

type accessibilityResult = {
  index: number;
  element: any;
  impactLevel: any;
  description: string;
  wcagCriteria: string;
};
