import { config } from "../config.js";
import type { MacroQuotes } from "../types.js";

type RendimientosPayload = {
  oficial?: { price?: number; prevClose?: number };
  mep?: { price?: number };
  riesgoPais?: { value?: number };
  updated?: string;
};

export const getMacroQuotes = async (): Promise<MacroQuotes | null> => {
  const response = await fetch(config.rendimientosCotizacionesUrl);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as RendimientosPayload;
  const oficial = Number(payload.oficial?.price);
  const mep = Number(payload.mep?.price);
  const riesgoPais = Number(payload.riesgoPais?.value);

  if (!Number.isFinite(oficial) || !Number.isFinite(mep) || !Number.isFinite(riesgoPais)) {
    return null;
  }

  return {
    oficial,
    mep,
    riesgoPais,
    updated: payload.updated ?? new Date().toISOString()
  };
};
