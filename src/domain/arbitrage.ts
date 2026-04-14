import type { ArbitrageInput, ArbitrageOpportunity, MarketQuote } from "../types.js";
import { round } from "../utils/math.js";

export const calculateCTA = (
  sellPrice: number,
  buyCommissionPct: number,
  marketRightsPct: number,
  taxPct: number
): number => sellPrice * (1 + buyCommissionPct + marketRightsPct + taxPct);

export const calculateINV = (
  buyPrice: number,
  sellCommissionPct: number,
  p2pExitSpreadPct: number
): number => buyPrice * (1 - sellCommissionPct - p2pExitSpreadPct);

export const calculateRentabilityPct = (inv: number, cta: number): number =>
  ((inv / cta) - 1) * 100;

export const evaluateArbitrage = (input: ArbitrageInput): ArbitrageOpportunity => {
  const cta = calculateCTA(
    input.buySide.sell,
    input.buyCommissionPct,
    input.marketRightsPct,
    input.taxPct
  );
  const inv = calculateINV(
    input.sellSide.buy,
    input.sellCommissionPct,
    input.sellSide.market === "CRYPTO" ? input.p2pExitSpreadPct : 0
  );
  const rentabilityPct = calculateRentabilityPct(inv, cta);
  const gainPerInvestmentArs = input.investmentArs * (rentabilityPct / 100);
  const entryPrice = input.buySide.sell.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const routeSteps = [
    input.buySide.market === "MEP"
      ? `Transferi tus pesos a ${input.buySide.providerName} para comprar MEP a $${entryPrice}`
      : `Transferi fondos a ${input.buySide.providerName} para comprar ${input.buySide.market}`,
    input.buySide.market === "MEP" ? "Esperar parking (24hs)" : "Sin parking obligatorio",
    input.buySide.market === "MEP" ? "Vender AL30D" : "Ejecutar salida inmediata",
    `Vender en ${input.sellSide.market} por ${input.sellSide.providerName}`
  ];

  return {
    buyMarket: input.buySide.market,
    sellMarket: input.sellSide.market,
    cta: round(cta, 2),
    inv: round(inv, 2),
    rentabilityPct: round(rentabilityPct, 4),
    gainPerInvestmentArs: round(gainPerInvestmentArs, 2),
    buySource: input.buySide.source,
    sellSource: input.sellSide.source,
    routeSteps
  };
};

const bestByMarket = (
  quotes: MarketQuote[],
  side: "buy" | "sell"
): Map<string, MarketQuote> => {
  const grouped = new Map<string, MarketQuote>();
  for (const quote of quotes) {
    const existing = grouped.get(quote.market);
    if (!existing) {
      grouped.set(quote.market, quote);
      continue;
    }
    if (side === "buy" && quote.sell < existing.sell) {
      grouped.set(quote.market, quote);
      continue;
    }
    if (side === "sell" && quote.buy > existing.buy) {
      grouped.set(quote.market, quote);
    }
  }
  return grouped;
};

export const evaluateAllRoutes = (
  quotes: MarketQuote[],
  brokerCommissionPct: number,
  marketRightsPct: number,
  feeBuyPct: number,
  feeSellPct: number,
  p2pExitSpreadPct: number,
  taxPct: number,
  investmentArs: number
): ArbitrageOpportunity[] => {
  const buySideByMarket = bestByMarket(quotes, "buy");
  const sellSideByMarket = bestByMarket(quotes, "sell");
  const markets = [...new Set(quotes.map((q) => q.market))];
  const opportunities: ArbitrageOpportunity[] = [];

  for (const buyMarket of markets) {
    for (const sellMarket of markets) {
      if (buyMarket === sellMarket) {
        continue;
      }
      const buySide = buySideByMarket.get(buyMarket);
      const sellSide = sellSideByMarket.get(sellMarket);
      if (!buySide || !sellSide) {
        continue;
      }
      const buyCommissionPct = buySide.market === "MEP" ? brokerCommissionPct : feeBuyPct;
      const sellCommissionPct = sellSide.market === "MEP" ? brokerCommissionPct : feeSellPct;
      opportunities.push(
        evaluateArbitrage({
          buySide,
          sellSide,
          buyCommissionPct,
          sellCommissionPct,
          marketRightsPct,
          taxPct,
          p2pExitSpreadPct,
          investmentArs
        })
      );
    }
  }

  return opportunities.sort((a, b) => b.rentabilityPct - a.rentabilityPct);
};
