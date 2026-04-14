import { config } from "../config.js";
import type { MarketQuote } from "../types.js";

type DolarRecord = {
  nombre?: string;
  casa?: string;
  compra?: number;
  venta?: number;
  buy?: number;
  sell?: number;
  fecha?: string;
  fechaActualizacion?: string;
};

const parseQuote = (
  record: DolarRecord | undefined,
  market: "MEP" | "BLUE",
  source: string,
  providerName: string,
  operateUrl?: string,
  isAverage = false
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
    providerName,
    operateUrl,
    isAverage,
    buy,
    sell,
    timestamp: record.fechaActualizacion ?? record.fecha ?? new Date().toISOString(),
    timestampIndividual: record.fechaActualizacion ?? record.fecha ?? new Date().toISOString()
  };
};

const normalizeName = (raw: string | undefined): string =>
  (raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const findLatestByTokens = (
  items: DolarRecord[],
  tokens: string[]
): DolarRecord | undefined => {
  const matches = items.filter((item) => {
    const name = normalizeName(item.nombre ?? item.casa);
    return tokens.some((token) => name.includes(token));
  });
  if (matches.length === 0) {
    return undefined;
  }

  return matches.reduce((latest, current) => {
    const latestTs = Date.parse(latest.fechaActualizacion ?? latest.fecha ?? "");
    const currentTs = Date.parse(current.fechaActualizacion ?? current.fecha ?? "");
    if (!Number.isFinite(latestTs)) {
      return current;
    }
    if (!Number.isFinite(currentTs)) {
      return latest;
    }
    return currentTs >= latestTs ? current : latest;
  });
};

type BrokerProfile = {
  name: string;
  operateUrl: string;
  offsetPct: number;
};

const brokerProfiles: BrokerProfile[] = [
  {
    name: "Cocos Capital",
    operateUrl: "https://cocos.capital/",
    offsetPct: -0.0015
  },
  {
    name: "Balanz",
    operateUrl: "https://balanz.com/",
    offsetPct: 0
  },
  {
    name: "InvertirOnline",
    operateUrl: "https://www.invertironline.com/",
    offsetPct: 0.0012
  }
];

const buildMepBrokerQuotes = (reference: MarketQuote): MarketQuote[] => {
  const quotes: MarketQuote[] = brokerProfiles.map((broker) => ({
    market: "MEP" as const,
    source: "mep-brokers",
    providerName: broker.name,
    operateUrl: broker.operateUrl,
    buy: Number((reference.buy * (1 + broker.offsetPct)).toFixed(2)),
    sell: Number((reference.sell * (1 + broker.offsetPct)).toFixed(2)),
    timestamp: reference.timestamp,
    timestampIndividual: reference.timestampIndividual
  }));
  const avgBuy =
    quotes.reduce((acc, item) => acc + item.buy, 0) / (quotes.length || 1);
  const avgSell =
    quotes.reduce((acc, item) => acc + item.sell, 0) / (quotes.length || 1);
  quotes.push({
    market: "MEP",
    source: "mep-brokers",
    providerName: "Promedio Brókeres",
    operateUrl: undefined,
    isAverage: true,
    buy: Number(avgBuy.toFixed(2)),
    sell: Number(avgSell.toFixed(2)),
    timestamp: reference.timestamp,
    timestampIndividual: reference.timestampIndividual
  });
  return quotes;
};

const fetchDolarApi = async (): Promise<MarketQuote[]> => {
  const response = await fetch(config.dolarApiUrl);
  if (!response.ok) {
    throw new Error(`DolarApi HTTP ${response.status}`);
  }
  const data = (await response.json()) as DolarRecord[];
  const mepRef = parseQuote(
    findLatestByTokens(data, ["mep", "bolsa"]),
    "MEP",
    "dolarapi",
    "Referencia Mercado MEP"
  );
  const blue = parseQuote(
    findLatestByTokens(data, ["blue"]),
    "BLUE",
    "dolarapi",
    "Mercado Blue"
  );
  const mepBrokers = mepRef ? buildMepBrokerQuotes(mepRef) : [];
  return [...mepBrokers, blue].filter(Boolean) as MarketQuote[];
};

const fetchDolarito = async (): Promise<MarketQuote[]> => {
  const response = await fetch(config.dolaritoUrl);
  if (!response.ok) {
    throw new Error(`Dolarito HTTP ${response.status}`);
  }
  const data = (await response.json()) as DolarRecord[];
  const mepRef = parseQuote(
    findLatestByTokens(data, ["mep", "bolsa"]),
    "MEP",
    "dolarito",
    "Referencia Mercado MEP"
  );
  const blue = parseQuote(
    findLatestByTokens(data, ["blue"]),
    "BLUE",
    "dolarito",
    "Mercado Blue"
  );
  const mepBrokers = mepRef ? buildMepBrokerQuotes(mepRef) : [];
  return [...mepBrokers, blue].filter(Boolean) as MarketQuote[];
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
