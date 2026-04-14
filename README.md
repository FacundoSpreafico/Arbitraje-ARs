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

- **CTA** = `Precio de Venta * (1 + comisión_compra + impuestos)`
- **INV** = `Precio de Compra * (1 - comisión_venta)`
- **Rentabilidad (%)** = `((INV / CTA) - 1) * 100`

La alerta se dispara cuando rentabilidad neta > `ALERT_THRESHOLD_PCT` (default 1.5%) y, para rutas con compra en MEP, el ajuste por volatilidad AL30 mantiene la rentabilidad por encima del umbral.

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
- API: `http://localhost:8080/api/status`

## Cumplimiento

Incluye advertencia operativa sobre límites de transferencias mensuales en USD de acuerdo con Com. A 7072 del BCRA. Debe validarse siempre la normativa vigente antes de operar.
