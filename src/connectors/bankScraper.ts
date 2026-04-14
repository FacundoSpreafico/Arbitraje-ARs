import * as cheerio from "cheerio";
import { config } from "../config.js";
import type { MarketQuote } from "../types.js";

const toPrice = (raw: string): number => {
  const normalized = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Number(normalized);
};

export const scrapeBankQuotes = async (): Promise<MarketQuote[]> => {
  if (!config.bankScraperEnabled || !config.bankScraperUrl) {
    return [];
  }
  if (!config.bankMepSelector || !config.bankBlueSelector) {
    throw new Error("Faltan selectores BANK_MEP_SELECTOR o BANK_BLUE_SELECTOR");
  }

  const response = await fetch(config.bankScraperUrl);
  if (!response.ok) {
    throw new Error(`Scraper HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const mepRaw = $(config.bankMepSelector).first().text().trim();
  const blueRaw = $(config.bankBlueSelector).first().text().trim();
  const mepSell = toPrice(mepRaw);
  const blueBuy = toPrice(blueRaw);

  if (!Number.isFinite(mepSell) || !Number.isFinite(blueBuy)) {
    throw new Error("No se pudieron parsear precios del scraper");
  }

  return [
    {
      market: "MEP",
      source: "bank-scraper",
      buy: mepSell,
      sell: mepSell,
      timestamp: new Date().toISOString()
    },
    {
      market: "BLUE",
      source: "bank-scraper",
      buy: blueBuy,
      sell: blueBuy,
      timestamp: new Date().toISOString()
    }
  ];
};
