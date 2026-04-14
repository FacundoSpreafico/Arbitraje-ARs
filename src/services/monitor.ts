import { config } from "../config.js";
import { evaluateAllRoutes } from "../domain/arbitrage.js";
import { assessParkingRisk } from "../domain/parkingRisk.js";
import { sendTelegramAlert } from "./alertService.js";
import { getAllQuotes, getParkingSeries } from "./marketData.js";
import type { DashboardSnapshot } from "../types.js";
import { round } from "../utils/math.js";

const complianceWarning =
  "Advertencia regulatoria: validar límites de transferencias mensuales en USD según Com. A 7072 BCRA y normativa vigente.";

let lastAlertFingerprint = "";

const getQuote = (market: "MEP" | "BLUE", field: "buy" | "sell", fallback: number, quotes: Awaited<ReturnType<typeof getAllQuotes>>): number => {
  const items = quotes.filter((q) => q.market === market);
  if (items.length === 0) {
    return fallback;
  }
  if (field === "sell") {
    return Math.min(...items.map((q) => q.sell));
  }
  return Math.max(...items.map((q) => q.buy));
};

export const evaluateSnapshot = async (): Promise<DashboardSnapshot> => {
  const [quotes, al30Closes] = await Promise.all([getAllQuotes(), getParkingSeries()]);
  const opportunities = evaluateAllRoutes(
    quotes,
    config.feeBuyPct,
    config.feeSellPct,
    config.taxPct,
    config.investmentArs
  );

  const bestOpportunity = opportunities[0] ?? null;
  const parkingRisk =
    bestOpportunity && bestOpportunity.buyMarket === "MEP" && al30Closes.length > 10
      ? assessParkingRisk(
          bestOpportunity.rentabilityPct,
          al30Closes.slice(-90),
          config.alertThresholdPct
        )
      : null;

  const mepSell = getQuote("MEP", "sell", 0, quotes);
  const blueSell = getQuote("BLUE", "sell", 0, quotes);
  const spreadActualPct = mepSell > 0 ? ((blueSell / mepSell) - 1) * 100 : 0;

  return {
    timestamp: new Date().toISOString(),
    precioCompraMEP: round(mepSell, 2),
    precioVentaBlue: round(blueSell, 2),
    spreadActualPct: round(spreadActualPct, 4),
    gananciaEstimadaPor100k: bestOpportunity?.gainPerInvestmentArs ?? 0,
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
    !snapshot.parkingRisk.expectedToHold
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
      ? `Parking AL30: volatilidad ${snapshot.parkingRisk.dailyVolatilityPct}% - ajustada ${snapshot.parkingRisk.adjustedRentabilityPct}%`
      : "Parking AL30: no aplica";

  const message = [
    "Arbitraje AR - Oportunidad detectada",
    `${snapshot.bestOpportunity.buyMarket} -> ${snapshot.bestOpportunity.sellMarket}`,
    `Rentabilidad neta: ${snapshot.bestOpportunity.rentabilityPct}%`,
    `Ganancia estimada por ARS ${config.investmentArs.toLocaleString("es-AR")}: ARS ${snapshot.bestOpportunity.gainPerInvestmentArs.toLocaleString("es-AR")}`,
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
