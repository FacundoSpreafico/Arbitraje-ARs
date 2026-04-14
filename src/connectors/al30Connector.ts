import { config } from "../config.js";

const parseCsvRows = (csv: string): string[] =>
  csv
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0);

const parseDate = (rawDate: string, rawTime: string | undefined): number => {
  if (!rawDate) {
    return Number.NaN;
  }
  if (rawTime) {
    return Date.parse(`${rawDate}T${rawTime}`);
  }
  return Date.parse(rawDate);
};

export const getAL30Closes = async (): Promise<number[]> => {
  if (!config.al30HistoryUrl) {
    return [];
  }
  const response = await fetch(config.al30HistoryUrl);
  if (!response.ok) {
    throw new Error(`AL30 history HTTP ${response.status}`);
  }

  const csv = await response.text();
  if (csv.toLowerCase().includes("apikey")) {
    return [];
  }
  const lines = parseCsvRows(csv);
  if (lines.length < 3) {
    return [];
  }

  const entries = lines
    .slice(1)
    .map((line) => {
      const columns = line.split(",");
      const timestamp = parseDate(columns[0], columns.length > 5 ? columns[1] : undefined);
      const closeIndex = columns.length > 5 ? 5 : 4;
      const close = Number(columns[closeIndex]);
      return { timestamp, close };
    })
    .filter((entry) => Number.isFinite(entry.timestamp) && Number.isFinite(entry.close));

  if (entries.length === 0) {
    return [];
  }

  const latestTs = entries[entries.length - 1].timestamp;
  const fourHoursAgo = latestTs - 4 * 60 * 60 * 1000;
  const recent = entries.filter((entry) => entry.timestamp >= fourHoursAgo);
  const source = recent.length >= 3 ? recent : entries.slice(-4);
  return source.map((entry) => entry.close);
};
