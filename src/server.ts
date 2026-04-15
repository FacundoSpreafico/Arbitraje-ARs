import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { evaluateSnapshot, executeAlerting } from "./services/monitor.js";
import type { MarketCode } from "./types.js";

const app = express();
app.use(cors());
app.use(express.json());

const parseCapital = (rawCapital: unknown): number | undefined => {
  const capitalRaw = Number(rawCapital);
  return Number.isFinite(capitalRaw) && capitalRaw > 0 ? capitalRaw : undefined;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "..", "public");
app.use(express.static(publicPath));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "arbitraje-ar" });
});

app.get("/api/status", async (_req, res) => {
  try {
    const capital = parseCapital(_req.query.capital);
    const snapshot = await evaluateSnapshot(capital);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      error: "No fue posible obtener cotizaciones",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("/api/status/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const capital = parseCapital(req.query.capital);
  let inFlight = false;

  const sendSnapshot = async (): Promise<void> => {
    if (inFlight || res.writableEnded) {
      return;
    }
    inFlight = true;
    try {
      const snapshot = await evaluateSnapshot(capital);
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: "No fue posible obtener cotizaciones",
          details
        })}\n\n`
      );
    } finally {
      inFlight = false;
    }
  };

  void sendSnapshot();
  const streamTimer = setInterval(() => {
    void sendSnapshot();
  }, config.refreshMs);
  const keepAliveTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keepalive\n\n");
    }
  }, 15_000);

  req.on("close", () => {
    clearInterval(streamTimer);
    clearInterval(keepAliveTimer);
    if (!res.writableEnded) {
      res.end();
    }
  });
});

type SimulationRecord = {
  id: string;
  createdAt: string;
  capital: number;
  buyMarket: MarketCode;
  sellMarket: MarketCode;
  expectedRentabilityPct: number;
  expectedGainArs: number;
  status: "pending" | "resolved";
  resolvedAt?: string;
  realizedRentabilityPct?: number;
  realizedGainArs?: number;
};

const simulations: SimulationRecord[] = [];

app.get("/api/simulations", (_req, res) => {
  res.json({ items: simulations });
});

app.post("/api/simulations", async (req, res) => {
  const capitalRaw = Number(req.body?.capital);
  const capital = Number.isFinite(capitalRaw) && capitalRaw > 0 ? capitalRaw : config.investmentArs;
  const snapshot = await evaluateSnapshot(capital);
  if (!snapshot.bestOpportunity) {
    res.status(400).json({ error: "No hay oportunidad para simular" });
    return;
  }
  const record: SimulationRecord = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    capital,
    buyMarket: snapshot.bestOpportunity.buyMarket,
    sellMarket: snapshot.bestOpportunity.sellMarket,
    expectedRentabilityPct: snapshot.bestOpportunity.rentabilityPct,
    expectedGainArs: snapshot.bestOpportunity.gainPerInvestmentArs,
    status: "pending"
  };
  simulations.unshift(record);
  res.status(201).json(record);
});

app.post("/api/simulations/:id/resolve", async (req, res) => {
  const record = simulations.find((item) => item.id === req.params.id);
  if (!record) {
    res.status(404).json({ error: "Simulación no encontrada" });
    return;
  }
  const snapshot = await evaluateSnapshot(record.capital);
  const routeNow =
    snapshot.bestOpportunity &&
    snapshot.bestOpportunity.buyMarket === record.buyMarket &&
    snapshot.bestOpportunity.sellMarket === record.sellMarket
      ? snapshot.bestOpportunity
      : null;
  record.status = "resolved";
  record.resolvedAt = new Date().toISOString();
  record.realizedRentabilityPct = routeNow?.rentabilityPct ?? 0;
  record.realizedGainArs = routeNow?.gainPerInvestmentArs ?? 0;
  res.json(record);
});

const startLoop = (): void => {
  const tick = async () => {
    try {
      const snapshot = await evaluateSnapshot();
      await executeAlerting(snapshot);
    } catch (error) {
      console.error("[monitor] error:", error);
    }
  };
  void tick();
  setInterval(() => {
    void tick();
  }, config.refreshMs);
};

app.listen(config.port, () => {
  console.log(`Arbitraje AR escuchando en http://localhost:${config.port}`);
  startLoop();
});
