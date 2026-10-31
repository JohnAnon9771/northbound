// A line chart of scores over dated entries (the last 12), with its legend. Used by the Diário, Fala and Progresso.
import { esc } from "../core/dom.js";
import { shortDate } from "../core/date.js";

// one color per score; distinct within each kind (conversation, text, speaking test)
export const CRIT_COLORS = {flu: "var(--sky)", gram: "var(--accent)", voc: "var(--sage)", ta: "var(--plum)", org: "var(--leather)", coh: "var(--leather)", pron: "var(--plum)"};

/* series: [{k, name, color}]. o.val(entry, k) reads a value (default entry.crit[k]); o.max and o.ticks set
   the scale (default 0 to 5). Missing values leave a gap in the dots but the line joins the ones present. */
export function lineChart(entries, series, label, o){
  o = Object.assign({max: 5, ticks: [0, 1, 2, 3, 4, 5], val: (e, k) => e.crit[k], H: 170}, o || {});
  const pts = entries.slice(-12), W = 600, H = o.H, padL = 32, padR = 12, top = 12, padB = 22;
  const x = i => pts.length === 1 ? (padL + W - padR) / 2 : padL + 10 + i * (W - padL - padR - 20) / (pts.length - 1), y = v => top + (H - padB - top) * (1 - Math.min(v, o.max) / o.max);
  let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + esc(label) + '">';
  o.ticks.forEach(v => { s += '<line x1="' + padL + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--rule)"/><text x="' + (padL - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>"; });
  series.forEach(c => {
    const p = pts.map((e, i) => o.val(e, c.k) == null ? null : [x(i), y(o.val(e, c.k))]).filter(Boolean);
    if (p.length > 1) s += '<polyline points="' + p.map(q => q.join(",")).join(" ") + '" fill="none" stroke="' + c.color + '" stroke-width="2.5" stroke-linejoin="round"/>';
    p.forEach(q => { s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.5" fill="' + c.color + '"/>'; });
  });
  pts.forEach((e, i) => { if (pts.length <= 6 || i % 2 === 0 || i === pts.length - 1) s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(shortDate(e.date)) + "</text>"; });
  return s + '</svg><ul class="legend">' + series.map(c => '<li style="--lc:' + c.color + '">' + esc(c.name) + "</li>").join("") + "</ul>";
}
