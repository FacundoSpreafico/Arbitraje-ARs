export type MarketCode = "MEP" | "BLUE" | "CRYPTO";

export type MarketQuote = {
  market: MarketCode;
  source: string;
  providerName: string;
  operateUrl?: string;
  isAverage?: boolean;
  buy: number;
  sell: number;
  buyFeePct?: number;
  sellFeePct?: number;
  timestamp: string;
  timestampIndividual: string;
};

export type ArbitrageInput = {
  buySide: MarketQuote;
  sellSide: MarketQuote;
  buyCommissionPct: number;
  sellCommissionPct: number;
  marketRightsPct: number;
  taxPct: number;
  p2pExitSpreadPct: number;
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
  routeSteps: string[];
};

export type ParkingRisk = {
  volatility4hPct: number;
  stressMovePct: number;
  adjustedRentabilityPct: number;
  expectedToHold: boolean;
  riskLabel: "ALTO" | "MODERADO";
};

export type OpportunityLevel = "VERDE" | "AMARILLO" | "ROJO";

export type MacroQuotes = {
  oficial: number;
  mep: number;
  riesgoPais: number;
  updated: string;
};

export type DashboardSnapshot = {
  timestamp: string;
  investmentArs: number;
  precioCompraMEP: number;
  precioCompraBlue: number;
  precioCompraCripto: number;
  precioVentaCripto: number;
  mepProviderName: string;
  mepProviderUrl?: string;
  blueProviderName: string;
  blueProviderUrl?: string;
  cryptoProviderName: string;
  cryptoProviderUrl?: string;
  selectedQuotes: Partial<
    Record<
      MarketCode,
      {
        provider_name: string;
        timestamp_individual: string;
        operate_url?: string;
        is_average?: boolean;
      }
    >
  >;
  spreadActualPct: number;
  gananciaEstimada: number;
  opportunityLevel: OpportunityLevel;
  marketOpen: boolean;
  quoteTimestamps: Partial<Record<MarketCode, string>>;
  macroQuotes: MacroQuotes | null;
  bestOpportunity: ArbitrageOpportunity | null;
  parkingRisk: ParkingRisk | null;
  warning: string;
};
