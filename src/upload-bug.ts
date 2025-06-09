import os from "os";
import path from "path";
import { chromium } from "playwright";
import TryberApi from "./TryberApi";

async function getScreenshot(url: string, element: string): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    timeout: 60000,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const filePath = path.join(
    path.join(os.homedir(), "Downloads"),
    `a11y-report-${Date.now()}.png`
  );
  await page.locator(element).screenshot({
    path: filePath,
    quality: 40,
    type: "jpeg",
    timeout: 6000,
  });

  return filePath;
}

export async function upload({
  cp_id,
  title,
  bugType,
  severity,
  url,
  element,
  description,
  notes,
  criteria,
  level,
}: {
  cp_id: number;
  title: string;
  bugType: string;
  severity: string;
  description: string;
  url: string;
  element: string;
  notes: string;
  criteria: string;
  level: string;
}): Promise<{ result: boolean }> {
  let media: string[] = [];
  const api = new TryberApi(cp_id);
  try {
    const screenshotPath = await getScreenshot(url, element);
    console.log("Screenshot taken at:", screenshotPath);
    console.log("Uploading screenshot...");
    const screenResult = await api.uploadMedia(screenshotPath);
    media.push(screenResult.path);
    console.log("Screenshot uploaded successfully:", screenResult);
  } catch (error) {
    console.error("Error taking or uploading screenshot:", error);
  }
  try {
    const USECASE_ID = await api.getFirstUsecaseId();
    const result = await api.uploadBugReport({
      USECASE_ID,
      title,
      bugType,
      severity,
      description,
      notes,
      criteria,
      level,
      media,
    });
    console.log("Bug report uploaded successfully:", result);
    return { result: true };
  } catch (error) {
    console.error("Error uploading bug report:", error);
    return { result: false };
  }
}
