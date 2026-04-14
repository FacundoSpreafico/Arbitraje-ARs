import { config } from "../config.js";
import type { MarketQuote } from "../types.js";

type DolarRecord = {
  nombre?: string;
  casa?: string;
  compra?: number;
  venta?: number;
  buy?: number;
  sell?: number;
};

const parseQuote = (
  record: DolarRecord | undefined,
  market: "MEP" | "BLUE",
  source: string
): MarketQuote | null => {
  if (!record) {
    return null;
  }
  const buy = Number(record.compra ?? record.buy);
  const sell = Number(record.venta ?? record.sell);
  if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
    return null;
  }
  return {
    market,
    source,
    buy,
    sell,
    timestamp: new Date().toISOString()
  };
};

const normalizeName = (raw: string | undefined): string =>
  (raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const findByName = (items: DolarRecord[], tokens: string[]): DolarRecord | undefined =>
  items.find((item) => {
    const name = normalizeName(item.nombre ?? item.casa);
    return tokens.some((token) => name.includes(token));
  });

const fetchDolarApi = async (): Promise<MarketQuote[]> => {
  const response = await fetch(config.dolarApiUrl);
  if (!response.ok) {
    throw new Error(`DolarApi HTTP ${response.status}`);
  }
  const data = (await response.json()) as DolarRecord[];
  const mep = parseQuote(findByName(data, ["mep"]), "MEP", "dolarapi");
  const blue = parseQuote(findByName(data, ["blue"]), "BLUE", "dolarapi");
  return [mep, blue].filter(Boolean) as MarketQuote[];
};

const fetchDolarito = async (): Promise<MarketQuote[]> => {
  const response = await fetch(config.dolaritoUrl);
  if (!response.ok) {
    throw new Error(`Dolarito HTTP ${response.status}`);
  }
  const data = (await response.json()) as DolarRecord[];
  const mep = parseQuote(findByName(data, ["mep"]), "MEP", "dolarito");
  const blue = parseQuote(findByName(data, ["blue"]), "BLUE", "dolarito");
  return [mep, blue].filter(Boolean) as MarketQuote[];
};

export const getMepBlueQuotes = async (): Promise<MarketQuote[]> => {
  if (config.marketDataProvider.toLowerCase() === "dolarito") {
    return fetchDolarito();
  }
  try {
    return await fetchDolarApi();
  } catch {
    return fetchDolarito();
  }
};
