import type { ParkingRisk } from "../types.js";
import { round } from "../utils/math.js";
import { stdDev } from "../utils/math.js";

const logReturns = (closes: number[]): number[] => {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    const current = closes[i];
    if (prev <= 0 || current <= 0) {
      continue;
    }
    returns.push(Math.log(current / prev));
  }
  return returns;
};

export const calculateDailyVolatilityPct = (closes: number[]): number =>
  stdDev(logReturns(closes)) * 100;

export const assessParkingRisk = (
  baseRentabilityPct: number,
  closes: number[],
  thresholdPct: number
): ParkingRisk => {
  const dailyVolatilityPct = calculateDailyVolatilityPct(closes);
  const stressMovePct = dailyVolatilityPct;
  const adjustedRentabilityPct = baseRentabilityPct - stressMovePct;

  return {
    dailyVolatilityPct: round(dailyVolatilityPct, 4),
    stressMovePct: round(stressMovePct, 4),
    adjustedRentabilityPct: round(adjustedRentabilityPct, 4),
    expectedToHold: adjustedRentabilityPct >= thresholdPct
  };
};
