// Number and text formatting for pt-BR.
export const formatHours = min => (min / 60).toLocaleString("pt-BR", {maximumFractionDigits: 1});
export const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
export const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
