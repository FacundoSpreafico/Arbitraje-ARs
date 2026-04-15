import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === "true";
};

export const config = {
  port: toNumber(process.env.PORT, 8080),
  refreshMs: toNumber(process.env.REFRESH_MS, 60_000),
  brokerCommissionPct: toNumber(process.env.BROKER_COMMISSION_PCT, 0.005),
  marketRightsPct: toNumber(process.env.MARKET_RIGHTS_PCT, 0.0001),
  feeBuyPct: toNumber(process.env.FEE_BUY_PCT, 0),
  feeSellPct: toNumber(process.env.FEE_SELL_PCT, 0),
  p2pExitSpreadPct: toNumber(process.env.P2P_EXIT_SPREAD_PCT, 0.01),
  taxPct: toNumber(process.env.TAX_PCT, 0),
  alertThresholdPct: toNumber(process.env.ALERT_THRESHOLD_PCT, 1.5),
  investmentArs: toNumber(process.env.INVESTMENT_ARS, 100_000),
  marketDataProvider: process.env.MKT_DATA_PROVIDER ?? "dolarapi",
  dolarApiUrl: process.env.DOLARAPI_URL ?? "https://dolarapi.com/v1/dolares",
  dolaritoUrl:
    process.env.DOLARITO_URL ??
    "https://api.argentinadatos.com/v1/cotizaciones/dolares",
  rendimientosCotizacionesUrl:
    process.env.RENDIMIENTOS_COTIZACIONES_URL ??
    "https://rendimientos.co/api/cotizaciones",
  binanceP2pUrl:
    process.env.BINANCE_P2P_URL ??
    "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
  binancePayTypes: (process.env.BINANCE_PAY_TYPES ?? "MercadoPago")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  al30HistoryUrl:
    process.env.AL30_HISTORY_URL ??
    "",
  bankScraperEnabled: toBoolean(process.env.BANK_SCRAPER_ENABLED, false),
  bankScraperUrl: process.env.BANK_SCRAPER_URL ?? "",
  bankMepSelector: process.env.BANK_MEP_SELECTOR ?? "",
  bankBlueSelector: process.env.BANK_BLUE_SELECTOR ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? ""
};
