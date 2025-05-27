import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";

export async function scrape(
  url: string,
  maxDepth: number
): Promise<{ result: string[] }> {
  const visited = new Set<string>();
  const result: string[] = [];

  async function crawl(currentUrl: string, depth: number) {
    if (depth > maxDepth || visited.has(currentUrl)) return;
    if (visited.size > 100) return; // massimo 100 pagine totali

    visited.add(currentUrl);
    result.push(currentUrl);

    try {
      const { data } = await axios.get(currentUrl);
      const $ = cheerio.load(data);

      const links: string[] = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (href) links.push(href);
      });

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

      for (const link of normalizedLinks) {
        await crawl(link, depth + 1);
      }
    } catch (err) {
      console.error(
        `Errore durante la richiesta di ${currentUrl}:`,
        (err as any).message || err
      );
    }
  }

  await crawl(url, 0);
  return { result };
}
