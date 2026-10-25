// EF SET score (0 to 100) to CEFR level, per the EF SET score bands.
export function efLevel(sc){ sc = Number(sc); if (!isFinite(sc)) return ""; return sc <= 20 ? "pré-A1" : sc <= 30 ? "A1" : sc <= 40 ? "A2" : sc <= 50 ? "B1" : sc <= 60 ? "B2" : sc <= 70 ? "C1" : "C2"; }
