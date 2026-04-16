# Arbitraje AR

Backend en Node.js + TypeScript para monitorear arbitraje entre **Dólar MEP, Blue y Cripto (USDT/ARS)**, con alertas por Telegram y control de riesgo de parking (AL30).

## Estructura de archivos

```text
finanzas/
├─ public/
│  └─ index.html
├─ src/
│  ├─ connectors/
│  │  ├─ al30Connector.ts
│  │  ├─ bankScraper.ts
│  │  ├─ cryptoConnector.ts
│  │  └─ mepBlueConnector.ts
│  ├─ domain/
│  │  ├─ arbitrage.ts
│  │  └─ parkingRisk.ts
│  ├─ services/
│  │  ├─ alertService.ts
│  │  ├─ marketData.ts
│  │  └─ monitor.ts
│  ├─ utils/
│  │  └─ math.ts
│  ├─ config.ts
│  ├─ server.ts
│  └─ types.ts
├─ .env.example
├─ package.json
└─ tsconfig.json
```

## Fórmulas implementadas

- **CTA** = `Precio Venta de compra * (1 + comisión bróker + derechos mercado + impuestos)`
- **INV** = `Precio Compra de salida * (1 - comisión venta - spread salida P2P)`
- **Rentabilidad (%)** = `((INV / CTA) - 1) * 100`

Normalización de rulo real: comparación con **MEP compra** y **Cripto venta** neteando comisiones por proveedor (según `MEP_FEE_BY_PROVIDER_PCT` y `CRYPTO_SELL_FEE_BY_PROVIDER_PCT`) más derechos/impuestos y `P2P_EXIT_SPREAD_PCT`.

La alerta se dispara cuando rentabilidad neta > `ALERT_THRESHOLD_PCT` (default 1.5%) y, para rutas con compra en MEP, exige que el parking AL30 no quede en riesgo alto.

## Uso

1. Copiar variables de entorno:

```bash
cp .env.example .env
```

2. Instalar dependencias y levantar:

```bash
npm install
npm run dev
```

3. Abrir:

- Dashboard: `http://localhost:8080`
- API: `http://localhost:8080/api/status?capital=100000`
- Simulaciones: `GET /api/simulations`, `POST /api/simulations`, `POST /api/simulations/:id/resolve`

## Cumplimiento

Incluye advertencia operativa sobre límites de transferencias mensuales en USD de acuerdo con Com. A 7072 del BCRA. Debe validarse siempre la normativa vigente antes de operar.
