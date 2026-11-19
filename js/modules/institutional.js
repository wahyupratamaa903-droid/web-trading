import { STATE, onEvent } from '../core/state.js';

const CORR_KEYS = ['xau', 'dxy', 'eur', 'btc', 'spx'];
const CORR_LABELS = { xau: 'XAU', dxy: 'DXY', eur: 'EUR', btc: 'BTC', spx: 'SPX' };

function pearsonCorrelation(arrA, arrB) {
  const n = Math.min(arrA.length, arrB.length);
  if (n < 5) return null;
  const a = arrA.slice(-n), b = arrB.slice(-n);
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db; denA += da * da; denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

function dailyReturns(candles) {
  if (!candles || candles.length < 2) return [];
  const rets = [];
  for (let i = 1; i < candles.length; i++) rets.push((candles[i].c - candles[i - 1].c) / candles[i - 1].c);
  return rets;
}

function cellColors(v) {
  if (v === null) return { bg: '#0f172a', fg: '#64748b' };
  if (v >= 0.6) return { bg: '#064e3b', fg: '#34d399' };
  if (v >= 0.2) return { bg: '#14532d', fg: '#6ee7b7' };
  if (v > -0.2) return { bg: '#1e293b', fg: '#94a3b8' };
  if (v > -0.6) return { bg: '#7f1d1d', fg: '#fca5a5' };
  return { bg: '#450a0a', fg: '#f87171' };
}

export function renderInstitutional() {
  const fgEl = document.getElementById('inst-fg');
  const fgLbl = document.getElementById('inst-fg-lbl');
  if (fgEl && STATE.fng) {
    const v = STATE.fng.value;
    fgEl.textContent = v;
    fgEl.className = 'text-base font-black ' + (v < 45 ? 'text-red-400' : v < 55 ? 'text-amber-400' : 'text-emerald-400');
    if (fgLbl) fgLbl.textContent = STATE.fng.label;
  }

  const vix = STATE.macro.vix?.price;
  const vixEl = document.getElementById('inst-vix');
  if (vixEl && vix) {
    vixEl.textContent = vix.toFixed(2);
    vixEl.className = 'text-base font-black ' + (vix > 25 ? 'text-red-400' : 'text-purple-400');
  }

  const us10y = STATE.macro.us10y?.price;
  const y10El = document.getElementById('inst-10y');
  if (y10El && us10y) y10El.textContent = us10y.toFixed(2) + '%';

  const tbl = document.getElementById('corr-matrix');
  if (!tbl) return;

  const returnsMap = {};
  CORR_KEYS.forEach(k => { returnsMap[k] = dailyReturns(STATE.macro[k]?.candles || []); });

  let html = '<thead><tr><th class="text-[8px] text-slate-600 p-1">30D</th>';
  CORR_KEYS.forEach(k => { html += `<th class="text-[8px] text-slate-400 font-bold p-1">${CORR_LABELS[k]}</th>`; });
  html += '</tr></thead><tbody>';

  CORR_KEYS.forEach(row => {
    html += `<tr><td class="text-[8px] text-slate-400 font-bold p-1">${CORR_LABELS[row]}</td>`;
    CORR_KEYS.forEach(col => {
      const val = row === col ? 1 : pearsonCorrelation(returnsMap[row], returnsMap[col]);
      const { bg, fg } = cellColors(val);
      html += `<td style="padding:2px"><div class="corr-cell" style="background:${bg};color:${fg};height:28px">${val === null ? 'N/A' : val.toFixed(2)}</div></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';
  tbl.innerHTML = html;
}

export function initInstitutional() {
  onEvent('market:updated', renderInstitutional);
}
