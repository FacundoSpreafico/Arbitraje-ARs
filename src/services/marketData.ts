import { getAL30Closes } from "../connectors/al30Connector.js";
import { scrapeBankQuotes } from "../connectors/bankScraper.js";
import { getCryptoQuote } from "../connectors/cryptoConnector.js";
import { getMepBlueQuotes } from "../connectors/mepBlueConnector.js";
import type { MarketQuote } from "../types.js";

export const getAllQuotes = async (): Promise<MarketQuote[]> => {
  const [mepBlue, crypto, banks] = await Promise.all([
    getMepBlueQuotes(),
    getCryptoQuote(),
    scrapeBankQuotes()
  ]);
  return [...mepBlue, crypto, ...banks];
};

export const getParkingSeries = async (): Promise<number[]> => getAL30Closes();
