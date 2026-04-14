import type { ArbitrageInput, ArbitrageOpportunity, MarketQuote } from "../types.js";
import { round } from "../utils/math.js";

export const calculateCTA = (
  sellPrice: number,
  feeBuyPct: number,
  taxPct: number
): number => sellPrice * (1 + feeBuyPct + taxPct);

export const calculateINV = (buyPrice: number, feeSellPct: number): number =>
  buyPrice * (1 - feeSellPct);

export const calculateRentabilityPct = (inv: number, cta: number): number =>
  ((inv / cta) - 1) * 100;

export const evaluateArbitrage = (input: ArbitrageInput): ArbitrageOpportunity => {
  const cta = calculateCTA(input.buySide.sell, input.feeBuyPct, input.taxPct);
  const inv = calculateINV(input.sellSide.buy, input.feeSellPct);
  const rentabilityPct = calculateRentabilityPct(inv, cta);
  const gainPerInvestmentArs = input.investmentArs * (rentabilityPct / 100);

  return {
    buyMarket: input.buySide.market,
    sellMarket: input.sellSide.market,
    cta: round(cta, 2),
    inv: round(inv, 2),
    rentabilityPct: round(rentabilityPct, 4),
    gainPerInvestmentArs: round(gainPerInvestmentArs, 2),
    buySource: input.buySide.source,
    sellSource: input.sellSide.source
  };
};

const uniqueByMarket = (quotes: MarketQuote[]): MarketQuote[] => {
  const grouped = new Map<string, MarketQuote>();
  for (const quote of quotes) {
    const existing = grouped.get(quote.market);
    if (!existing || quote.sell < existing.sell) {
      grouped.set(quote.market, quote);
    }
  }
  return [...grouped.values()];
};

export const evaluateAllRoutes = (
  quotes: MarketQuote[],
  feeBuyPct: number,
  feeSellPct: number,
  taxPct: number,
  investmentArs: number
): ArbitrageOpportunity[] => {
  const marketQuotes = uniqueByMarket(quotes);
  const opportunities: ArbitrageOpportunity[] = [];

  for (const buySide of marketQuotes) {
    for (const sellSide of marketQuotes) {
      if (buySide.market === sellSide.market) {
        continue;
      }
      opportunities.push(
        evaluateArbitrage({
          buySide,
          sellSide,
          feeBuyPct,
          feeSellPct,
          taxPct,
          investmentArs
        })
      );
    }
  }

  return opportunities.sort((a, b) => b.rentabilityPct - a.rentabilityPct);
};
