export type MarketCode = "MEP" | "BLUE" | "CRYPTO";

export type MarketQuote = {
  market: MarketCode;
  source: string;
  buy: number;
  sell: number;
  timestamp: string;
};

export type ArbitrageInput = {
  buySide: MarketQuote;
  sellSide: MarketQuote;
  feeBuyPct: number;
  feeSellPct: number;
  taxPct: number;
  investmentArs: number;
};

export type ArbitrageOpportunity = {
  buyMarket: MarketCode;
  sellMarket: MarketCode;
  cta: number;
  inv: number;
  rentabilityPct: number;
  gainPerInvestmentArs: number;
  buySource: string;
  sellSource: string;
};

export type ParkingRisk = {
  dailyVolatilityPct: number;
  stressMovePct: number;
  adjustedRentabilityPct: number;
  expectedToHold: boolean;
};

export type DashboardSnapshot = {
  timestamp: string;
  precioCompraMEP: number;
  precioVentaBlue: number;
  spreadActualPct: number;
  gananciaEstimadaPor100k: number;
  bestOpportunity: ArbitrageOpportunity | null;
  parkingRisk: ParkingRisk | null;
  warning: string;
};
