import { config } from "../config.js";
import type { MarketQuote } from "../types.js";

type BinanceAdvert = {
  adv?: { price?: string | number };
};

type BinanceResponse = {
  code?: string;
  message?: string | null;
  total?: number;
  data?: BinanceAdvert[];
};

type BitsoTickerResponse = {
  success?: boolean;
  payload?: {
    ask?: string;
    bid?: string;
    created_at?: string;
  };
};

const parsePrice = (payload: BinanceResponse, side: "BUY" | "SELL"): number => {
  for (const advert of payload.data ?? []) {
    const parsed = Number(advert.adv?.price);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new Error(
    `No se pudo parsear precio Binance P2P (${side}). code=${payload.code ?? "n/a"} total=${payload.total ?? 0}`
  );
};

const fetchBinanceSide = async (
  tradeType: "BUY" | "SELL",
  withPayTypes: boolean
): Promise<BinanceResponse> => {
  const response = await fetch(config.binanceP2pUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page: 1,
      rows: 5,
      fiat: "ARS",
      tradeType,
      asset: "USDT",
      ...(withPayTypes && config.binancePayTypes.length > 0
        ? { payTypes: config.binancePayTypes }
        : {})
    })
  });
  if (!response.ok) {
    throw new Error(`Binance P2P error (${tradeType}) HTTP ${response.status}`);
  }
  return (await response.json()) as BinanceResponse;
};

const fetchWithFallback = async (tradeType: "BUY" | "SELL"): Promise<BinanceResponse> => {
  const primary = await fetchBinanceSide(tradeType, true);
  if ((primary.data?.length ?? 0) > 0) {
    return primary;
  }
  return fetchBinanceSide(tradeType, false);
};

export const getCryptoQuote = async (): Promise<MarketQuote> => {
  const [buyPayload, sellPayload] = await Promise.all([
    fetchWithFallback("BUY"),
    fetchWithFallback("SELL")
  ]);

  const quote: MarketQuote = {
    market: "CRYPTO",
    source: "binance-p2p",
    providerName: "Binance P2P",
    operateUrl: "https://p2p.binance.com/",
    buy: parsePrice(sellPayload, "SELL"),
    sell: parsePrice(buyPayload, "BUY"),
    buyFeePct: config.feeBuyPct,
    sellFeePct: config.cryptoSellFeeByProviderPct["Binance P2P"] ?? config.feeSellPct,
    timestamp: new Date().toISOString(),
    timestampIndividual: new Date().toISOString()
  };
  return quote;
};

const getBitsoQuote = async (): Promise<MarketQuote | null> => {
  const response = await fetch("https://api.bitso.com/v3/ticker/?book=usdt_ars");
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as BitsoTickerResponse;
  const ask = Number(payload.payload?.ask);
  const bid = Number(payload.payload?.bid);
  if (!Number.isFinite(ask) || !Number.isFinite(bid)) {
    return null;
  }
  const ts = payload.payload?.created_at ?? new Date().toISOString();
  return {
    market: "CRYPTO",
    source: "bitso-spot",
    providerName: "Bitso",
    operateUrl: "https://bitso.com/ar/",
    buy: bid,
    sell: ask,
    buyFeePct: config.feeBuyPct,
    sellFeePct: config.cryptoSellFeeByProviderPct.Bitso ?? config.feeSellPct,
    timestamp: ts,
    timestampIndividual: ts
  };
};

export const getCryptoQuotes = async (): Promise<MarketQuote[]> => {
  const [binance, bitso] = await Promise.all([getCryptoQuote(), getBitsoQuote()]);
  return [binance, bitso].filter(Boolean) as MarketQuote[];
};
