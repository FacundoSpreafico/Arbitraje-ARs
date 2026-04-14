import { config } from "../config.js";

export const getAL30Closes = async (): Promise<number[]> => {
  const response = await fetch(config.al30HistoryUrl);
  if (!response.ok) {
    throw new Error(`AL30 history HTTP ${response.status}`);
  }

  const csv = await response.text();
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 3) {
    return [];
  }

  const closes = lines
    .slice(1)
    .map((line) => {
      const columns = line.split(",");
      return Number(columns[4]);
    })
    .filter((value) => Number.isFinite(value));

  return closes;
};
