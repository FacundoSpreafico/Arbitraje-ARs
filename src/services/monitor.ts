import { config } from "../config.js";
import { getMacroQuotes } from "../connectors/macroQuotesConnector.js";
import { evaluateAllRoutes } from "../domain/arbitrage.js";
import { assessParkingRisk } from "../domain/parkingRisk.js";
import { sendTelegramAlert } from "./alertService.js";
import { getAllQuotes, getParkingSeries } from "./marketData.js";
import type { DashboardSnapshot, MarketCode, OpportunityLevel } from "../types.js";
import { round } from "../utils/math.js";

const complianceWarning =
  "Advertencia regulatoria: validar límites de transferencias mensuales en USD según Com. A 7072 BCRA y normativa vigente.";

let lastAlertFingerprint = "";

const getBestQuote = (
  market: MarketCode,
  field: "buy" | "sell",
  quotes: Awaited<ReturnType<typeof getAllQuotes>>
) => {
  const items = quotes.filter((q) => q.market === market);
  if (items.length === 0) {
    return null;
  }
  if (field === "sell") {
    return items.reduce((best, current) => (current.sell < best.sell ? current : best));
  }
  return items.reduce((best, current) => (current.buy > best.buy ? current : best));
};

const getCheapestQuote = (
  market: MarketCode,
  field: "buy" | "sell",
  quotes: Awaited<ReturnType<typeof getAllQuotes>>
) => {
  const items = quotes.filter((q) => q.market === market);
  if (items.length === 0) {
    return null;
  }
  if (field === "sell") {
    return items.reduce((best, current) => (current.sell < best.sell ? current : best));
  }
  return items.reduce((best, current) => (current.buy < best.buy ? current : best));
};

const getLatestTimestamp = (
  market: MarketCode,
  quotes: Awaited<ReturnType<typeof getAllQuotes>>
): string | undefined => {
  const items = quotes.filter((q) => q.market === market);
  if (items.length === 0) {
    return undefined;
  }
  return items
    .map((q) => q.timestampIndividual)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
};

const getOpportunityLevel = (rentabilityPct: number): OpportunityLevel => {
  if (rentabilityPct > 2) {
    return "VERDE";
  }
  if (rentabilityPct >= 0.5) {
    return "AMARILLO";
  }
  return "ROJO";
};

const isMarketOpen = (date: Date): boolean => {
  const day = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  if (day === 0 || day === 6) {
    return false;
  }
  const minutesFromMidnight = hour * 60 + minute;
  return minutesFromMidnight >= 11 * 60 && minutesFromMidnight <= 16 * 60;
};

export const evaluateSnapshot = async (investmentArsOverride?: number): Promise<DashboardSnapshot> => {
  const investmentArs = Number.isFinite(investmentArsOverride)
    ? Number(investmentArsOverride)
    : config.investmentArs;
  const [quotes, al30Closes, macroQuotes] = await Promise.all([
    getAllQuotes(),
    getParkingSeries(),
    getMacroQuotes()
  ]);
  const opportunities = evaluateAllRoutes(
    quotes,
    config.brokerCommissionPct,
    config.marketRightsPct,
    config.feeBuyPct,
    config.feeSellPct,
    config.p2pExitSpreadPct,
    config.taxPct,
    investmentArs
  );

  const bestOpportunity = opportunities[0] ?? null;
  const parkingRisk =
    bestOpportunity && bestOpportunity.buyMarket === "MEP" && al30Closes.length > 2
      ? assessParkingRisk(
          bestOpportunity.rentabilityPct,
          al30Closes,
          config.alertThresholdPct
        )
      : null;

  const mepBuyCheapestQuote = getCheapestQuote("MEP", "sell", quotes);
  const blueBuyCheapestQuote = getCheapestQuote("BLUE", "buy", quotes);
  const mepBuy = mepBuyCheapestQuote?.sell ?? 0;
  const blueBuy = blueBuyCheapestQuote?.buy ?? 0;
  const cryptoSellBestQuote = getBestQuote("CRYPTO", "buy", quotes);
  const cryptoSell = cryptoSellBestQuote?.buy ?? 0;
  const mepBestQuote = mepBuyCheapestQuote;
  const blueBestQuote = blueBuyCheapestQuote;
  const cryptoBestQuote = cryptoSellBestQuote;
  const spreadActualPct = mepBuy > 0 ? ((cryptoSell / mepBuy) - 1) * 100 : 0;
  const quoteTimestamps: Partial<Record<MarketCode, string>> = {
    MEP: getLatestTimestamp("MEP", quotes),
    BLUE: getLatestTimestamp("BLUE", quotes),
    CRYPTO: getLatestTimestamp("CRYPTO", quotes)
  };
  const now = new Date();

  return {
    timestamp: now.toISOString(),
    investmentArs,
    precioCompraMEP: round(mepBuy, 2),
    precioCompraBlue: round(blueBuy, 2),
    precioCompraCripto: round(cryptoSell, 2),
    precioVentaCripto: round(cryptoSell, 2),
    mepProviderName: mepBestQuote?.providerName ?? "N/D",
    mepProviderUrl: mepBestQuote?.operateUrl,
    blueProviderName: blueBestQuote?.providerName ?? "N/D",
    blueProviderUrl: blueBestQuote?.operateUrl,
    cryptoProviderName: cryptoBestQuote?.providerName ?? "N/D",
    cryptoProviderUrl: cryptoBestQuote?.operateUrl,
    selectedQuotes: {
      MEP: mepBestQuote
        ? {
            provider_name: mepBestQuote.providerName,
            timestamp_individual: mepBestQuote.timestampIndividual,
            operate_url: mepBestQuote.operateUrl,
            is_average: mepBestQuote.isAverage
          }
        : undefined,
      BLUE: blueBestQuote
        ? {
            provider_name: blueBestQuote.providerName,
            timestamp_individual: blueBestQuote.timestampIndividual,
            operate_url: blueBestQuote.operateUrl,
            is_average: blueBestQuote.isAverage
          }
        : undefined,
      CRYPTO: cryptoBestQuote
        ? {
            provider_name: cryptoBestQuote.providerName,
            timestamp_individual: cryptoBestQuote.timestampIndividual,
            operate_url: cryptoBestQuote.operateUrl,
            is_average: cryptoBestQuote.isAverage
          }
        : undefined
    },
    spreadActualPct: round(spreadActualPct, 4),
    gananciaEstimada: bestOpportunity?.gainPerInvestmentArs ?? 0,
    opportunityLevel: getOpportunityLevel(bestOpportunity?.rentabilityPct ?? 0),
    marketOpen: isMarketOpen(now),
    quoteTimestamps,
    macroQuotes,
    bestOpportunity,
    parkingRisk,
    warning: complianceWarning
  };
};

const shouldAlert = (snapshot: DashboardSnapshot): boolean => {
  const profitability = snapshot.bestOpportunity?.rentabilityPct ?? 0;
  if (profitability < config.alertThresholdPct) {
    return false;
  }
  if (
    snapshot.bestOpportunity?.buyMarket === "MEP" &&
    snapshot.parkingRisk &&
    (!snapshot.parkingRisk.expectedToHold || snapshot.parkingRisk.riskLabel === "ALTO")
  ) {
    return false;
  }
  return true;
};

export const executeAlerting = async (snapshot: DashboardSnapshot): Promise<void> => {
  if (!snapshot.bestOpportunity || !shouldAlert(snapshot)) {
    return;
  }

  const parkingText =
    snapshot.parkingRisk && snapshot.bestOpportunity.buyMarket === "MEP"
      ? `Parking AL30: volatilidad 4h ${snapshot.parkingRisk.volatility4hPct}% (${snapshot.parkingRisk.riskLabel}) - ajustada ${snapshot.parkingRisk.adjustedRentabilityPct}%`
      : "Parking AL30: no aplica";

  const message = [
    "Arbitraje AR - Oportunidad detectada",
    `${snapshot.bestOpportunity.buyMarket} -> ${snapshot.bestOpportunity.sellMarket}`,
    `Rentabilidad neta: ${snapshot.bestOpportunity.rentabilityPct}%`,
    `Ganancia estimada por ARS ${snapshot.investmentArs.toLocaleString("es-AR")}: ARS ${snapshot.bestOpportunity.gainPerInvestmentArs.toLocaleString("es-AR")}`,
    parkingText
  ].join("\n");

  const fingerprint = `${snapshot.bestOpportunity.buyMarket}-${snapshot.bestOpportunity.sellMarket}-${snapshot.bestOpportunity.rentabilityPct}`;
  if (fingerprint === lastAlertFingerprint) {
    return;
  }
  const sent = await sendTelegramAlert(message);
  if (sent) {
    lastAlertFingerprint = fingerprint;
  }
};
