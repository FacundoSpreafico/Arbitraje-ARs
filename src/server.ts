import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { evaluateSnapshot, executeAlerting } from "./services/monitor.js";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "..", "public");
app.use(express.static(publicPath));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "arbitraje-ar" });
});

app.get("/api/status", async (_req, res) => {
  try {
    const snapshot = await evaluateSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      error: "No fue posible obtener cotizaciones",
      details: error instanceof Error ? error.message : String(error)
    });
  }
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
