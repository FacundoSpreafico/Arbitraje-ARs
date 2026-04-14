import { getAL30Closes } from "../connectors/al30Connector.js";
import { scrapeBankQuotes } from "../connectors/bankScraper.js";
import { getCryptoQuotes } from "../connectors/cryptoConnector.js";
import { getMepBlueQuotes } from "../connectors/mepBlueConnector.js";
import type { MarketQuote } from "../types.js";

export const getAllQuotes = async (): Promise<MarketQuote[]> => {
  const [mepBlue, cryptoQuotes, banks] = await Promise.all([
    getMepBlueQuotes(),
    getCryptoQuotes(),
    scrapeBankQuotes()
  ]);
  return [...mepBlue, ...cryptoQuotes, ...banks];
};

export const getParkingSeries = async (): Promise<number[]> => getAL30Closes();
