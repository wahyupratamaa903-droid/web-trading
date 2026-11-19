import { STATE, onEvent } from '../core/state.js';
import { esc } from '../core/utils.js';

export function renderSMC() {
  const zc = document.getElementById('smc-zones');
  const hc = document.getElementById('liq-heatmap');
  if (!zc || !hc) return;

  const h1 = STATE.xauH1 || [];
  const d1 = STATE.assets.xau?.candles || [];
  const xau = STATE.prices.xau || (h1.length ? h1[h1.length - 1].c : 0);

  if (h1.length < 24 || !xau) {
    zc.innerHTML = '<p class="text-[10px] text-slate-500">Menunggu data candle OHLC untuk pemetaan struktur SMC...</p>';
    return;
  }

  const recent24H = h1.slice(-24);
  const recent72H = h1.slice(-72);
  const h1High = Math.max(...recent24H.map(c => c.h));
  const h1Low = Math.min(...recent24H.map(c => c.l));
  const h4High = Math.max(...recent72H.map(c => c.h));
  const h4Low = Math.min(...recent72H.map(c => c.l));
  const d1High = d1.length ? Math.max(...d1.slice(-14).map(c => c.h)) : h4High;
  const d1Low = d1.length ? Math.min(...d1.slice(-14).map(c => c.l)) : h4Low;

  const obBull = h1Low + (h1High - h1Low) * 0.236;
  const obBear = h1High - (h1High - h1Low) * 0.236;

  const zones = [
    { type: 'BSL / D1 HIGH', price: d1High, tf: 'D1', cls: 'smc-eq-high', icon: '💧', desc: 'Buy-Side Liquidity di atas puncak 14 hari terakhir — target sweep institusi' },
    { type: 'BOS / H4 HIGH', price: h4High, tf: 'H4', cls: 'smc-bos', icon: '↗', desc: 'Level Break of Structure H4 — penutupan di atas level ini konfirmasi bullish' },
    { type: 'SUPPLY / OB', price: obBear, tf: 'H1', cls: 'smc-choch', icon: '📦', desc: 'Zona Supply / Premium 76.4% swing H1 — area reaksi seller' },
    { type: 'DEMAND / OB', price: obBull, tf: 'H1', cls: 'smc-ob', icon: '📦', desc: 'Zona Demand / Discount 23.6% swing H1 — area reaksi buyer' },
    { type: 'CHoCH / H1 LOW', price: h1Low, tf: 'H1', cls: 'smc-eq-low', icon: '↩', desc: 'Swing Low 24 jam — tembus ke bawah memicu Change of Character bearish' },
    { type: 'SSL / D1 LOW', price: d1Low, tf: 'D1', cls: 'smc-liq', icon: '🛡️', desc: 'Sell-Side Liquidity di bawah lembah 14 hari terakhir' }
  ];

  zc.innerHTML = zones.map(z => `
    <div class="smc-zone ${z.cls}">
      <div class="flex items-center justify-between mb-0.5">
        <div class="flex items-center gap-2"><span class="text-[9px] font-black text-slate-200">${esc(z.icon)} ${esc(z.type)}</span><span class="text-[8px] text-slate-500 font-mono">${esc(z.tf)}</span></div>
        <span class="text-[9px] font-mono font-bold text-amber-400">$${z.price.toFixed(2)}</span>
      </div>
      <p class="text-[9px] text-slate-400 leading-snug">${esc(z.desc)}</p>
    </div>
  `).join('');

  const heatmap = [
    { level: 'Major Resistance (D1)', price: d1High, strength: 90, color: 'bg-red-500' },
    { level: 'Intraday High (H4)', price: h4High, strength: 72, color: 'bg-orange-500' },
    { level: 'Current Spot Price', price: xau, strength: 55, color: 'bg-amber-500' },
    { level: 'Intraday Low (H1)', price: h1Low, strength: 70, color: 'bg-blue-500' },
    { level: 'Major Support (D1)', price: d1Low, strength: 92, color: 'bg-emerald-500' }
  ];

  hc.innerHTML = heatmap.map(h => `
    <div class="heat-row">
      <span class="text-[8px] text-slate-400 w-32 shrink-0">${esc(h.level)}</span>
      <div class="heat-bar-wrap"><div class="heat-bar ${h.color}" style="width:${h.strength}%"></div></div>
      <span class="text-[8px] font-mono text-slate-300 shrink-0 w-16 text-right">$${h.price.toFixed(2)}</span>
    </div>
  `).join('');
}

export function initSMC() {
  onEvent('market:updated', renderSMC);
}
