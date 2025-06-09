import puppeteer from "puppeteer";
import { URL } from "url";

function stripFragment(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href;
  } catch {
    return url;
  }
}

export async function scrape(url: string, maxDepth: number) {
  const visited = new Set<string>();
  const result: string[] = [];

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  async function crawl(url: string, depth: number) {
    const currentUrl = stripFragment(url);
    console.log(`Crawling: ${currentUrl} (depth: ${depth})`);
    if (depth > maxDepth || visited.has(currentUrl)) return;
    console.log(`Visiting: ${currentUrl}`);
    if (visited.size > 2) return;

    visited.add(currentUrl);
    result.push(currentUrl);

    try {
      console.log(`Navigating to: ${currentUrl}`);
      await page.goto(currentUrl, {
        waitUntil: "networkidle2",
        timeout: 10000,
      });

      const links: string[] = await page.$$eval("a[href]", (elements) =>
        elements.map((el) => (el as HTMLAnchorElement).href)
      );

      const base = new URL(currentUrl);
      const normalizedLinks = links
        .map((link) => {
          try {
            return new URL(link, base).href;
          } catch {
            return null;
          }
        })
        .filter((link): link is string => !!link)
        .filter((link) => link.startsWith(base.origin));
      console.log(`Found ${normalizedLinks.length} links on ${currentUrl}`);

      for (const link of normalizedLinks) {
        await crawl(link, depth + 1);
      }
    } catch (err) {
      console.error(`Errore a ${currentUrl}:`, (err as any).message);
    }
  }

  await crawl(url, 0);
  await browser.close();
  return { result };
}
