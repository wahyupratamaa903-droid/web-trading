import { STATE, onEvent } from '../core/state.js';
import { formatPairPrice } from '../core/pairs.js';
import { esc } from '../core/utils.js';

export function renderSMC() {
  const zc = document.getElementById('smc-zones');
  const hc = document.getElementById('liq-heatmap');
  const titleEl = document.getElementById('smc-pair-label');
  if (!zc || !hc) return;

  const data = STATE.activeData;
  const pair = STATE.activePair;
  if (titleEl) titleEl.textContent = `${pair} (${STATE.timeframe})`;

  const candles = data?.candles || [];
  const px = data?.price || 0;

  if (candles.length < 20 || !px) {
    zc.innerHTML = '<p class="text-[10px] text-slate-400">Menunggu data candle OHLC untuk pemetaan zona SMC...</p>';
    return;
  }

  const recent15 = candles.slice(-15);
  const recent40 = candles.slice(-40);

  const swingHighShort = Math.max(...recent15.map(c => c.h));
  const swingLowShort = Math.min(...recent15.map(c => c.l));
  const swingHighMid = Math.max(...recent40.map(c => c.h));
  const swingLowMid = Math.min(...recent40.map(c => c.l));
  const majorHigh = Math.max(...candles.map(c => c.h));
  const majorLow = Math.min(...candles.map(c => c.l));

  const supplyOB = swingHighShort - (swingHighShort - swingLowShort) * 0.236;
  const demandOB = swingLowShort + (swingHighShort - swingLowShort) * 0.236;

  const zones = [
    { type: 'BSL / MAJOR HIGH', price: majorHigh, cls: 'smc-eq-high', icon: '💧', desc: 'Buy-Side Liquidity di atas puncak tertinggi periode aktif' },
    { type: 'BOS / SWING HIGH', price: swingHighMid, cls: 'smc-bos', icon: '↗', desc: 'Break of Structure — penutupan di atas level ini konfirmasi kelanjutan naik' },
    { type: 'PREMIUM / SUPPLY OB', price: supplyOB, cls: 'smc-choch', icon: '📦', desc: 'Zona Supply / Order Block jual (76.4% Fibonacci swing)' },
    { type: 'DISCOUNT / DEMAND OB', price: demandOB, cls: 'smc-ob', icon: '📦', desc: 'Zona Demand / Order Block beli (23.6% Fibonacci swing)' },
    { type: 'CHoCH / SWING LOW', price: swingLowMid, cls: 'smc-eq-low', icon: '↩', desc: 'Change of Character — tembus ke bawah memicu struktur bearish' },
    { type: 'SSL / MAJOR LOW', price: majorLow, cls: 'smc-liq', icon: '🛡️', desc: 'Sell-Side Liquidity di bawah lembah terendah periode aktif' }
  ];

  zc.innerHTML = zones.map(z => `
    <div class="smc-zone ${z.cls}">
      <div class="flex items-center justify-between mb-0.5">
        <span class="text-[9px] font-black text-slate-200">${esc(z.icon)} ${esc(z.type)}</span>
        <span class="text-[9px] font-mono font-bold text-amber-400">${formatPairPrice(pair, z.price)}</span>
      </div>
      <p class="text-[9px] text-slate-400 leading-snug">${esc(z.desc)}</p>
    </div>
  `).join('');

  const heatmap = [
    { level: 'Major Resistance', price: majorHigh, strength: 92, color: 'bg-red-500' },
    { level: 'Swing High', price: swingHighMid, strength: 74, color: 'bg-orange-500' },
    { level: 'Current Price', price: px, strength: 55, color: 'bg-amber-500' },
    { level: 'Swing Low', price: swingLowMid, strength: 72, color: 'bg-blue-500' },
    { level: 'Major Support', price: majorLow, strength: 94, color: 'bg-emerald-500' }
  ];

  hc.innerHTML = heatmap.map(h => `
    <div class="heat-row">
      <span class="text-[8px] text-slate-400 w-28 shrink-0">${esc(h.level)}</span>
      <div class="heat-bar-wrap"><div class="heat-bar ${h.color}" style="width:${h.strength}%"></div></div>
      <span class="text-[8px] font-mono text-slate-200 shrink-0 w-20 text-right">${formatPairPrice(pair, h.price)}</span>
    </div>
  `).join('');
}

export function initSMC() {
  onEvent('market:updated', renderSMC);
}
