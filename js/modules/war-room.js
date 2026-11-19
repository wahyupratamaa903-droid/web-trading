import { STATE, setActivePair, onEvent } from '../core/state.js';
import { PRESET_PAIRS, getPairMeta, formatPairPrice } from '../core/pairs.js';
import { esc } from '../core/utils.js';
import { refreshMarketData } from './price-feed.js';

let lastChartTvSymbol = '';

function ema(vals, period) {
  if (vals.length < period) return null;
  const k = 2 / (period + 1);
  let e = vals.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < vals.length; i++) e = vals[i] * k + e * (1 - k);
  return e;
}

function rsi(closes, period = 14) {
  if (closes.length <= period) return 50;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let ag = g / period, al = l / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  return al === 0 ? 100 : 100 - (100 / (1 + ag / al));
}

export function syncChartWidget() {
  const meta = getPairMeta(STATE.activePair);
  const titleEl = document.getElementById('chart-pair-title');
  if (titleEl) titleEl.textContent = `${meta.pair} (${meta.tv}) — Live Chart`;

  if (typeof TradingView === 'undefined') return;
  if (lastChartTvSymbol === meta.tv) return;
  lastChartTvSymbol = meta.tv;

  const container = document.getElementById('tv_chart');
  if (!container) return;
  container.innerHTML = '';

  new TradingView.widget({
    autosize: true,
    symbol: meta.tv,
    interval: STATE.timeframe === '15m' ? '15' : STATE.timeframe === '1d' ? 'D' : '60',
    timezone: 'Asia/Jakarta',
    theme: 'dark',
    style: '1',
    locale: 'id',
    toolbar_bg: '#03030a',
    enable_publishing: false,
    hide_side_toolbar: true,
    allow_symbol_change: true,
    container_id: 'tv_chart'
  });
}

export function renderWarRoom() {
  const container = document.getElementById('war-room-content');
  if (!container) return;

  const data = STATE.activeData;
  const pair = STATE.activePair;
  if (!data || !data.price) {
    container.innerHTML = '<p class="text-[10px] text-slate-400 py-3">Memuat analisis multi-faktor real-time...</p>';
    return;
  }

  const candles = data.candles || [];
  const closes = candles.map(c => c.c);
  const px = data.price;
  const ch = data.changePct || 0;
  const ema20 = ema(closes, 20) || px;
  const ema50 = ema(closes, 50) || px;
  const rsiVal = rsi(closes, 14);

  const dayRange = (data.dayHigh - data.dayLow) || 1;
  const rangePos = Math.max(0, Math.min(100, ((px - data.dayLow) / dayRange) * 100));

  const dxy = STATE.macro.dxy;
  const vix = STATE.macro.vix;
  const us10y = STATE.macro.us10y;

  const factors = [
    {
      name: '1. Struktur Tren (EMA 20/50)',
      score: px > ema20 && ema20 > ema50 ? 1 : (px < ema20 && ema20 < ema50 ? -1 : 0),
      detail: `Harga ${formatPairPrice(pair, px)} vs EMA20 (${formatPairPrice(pair, ema20)}) & EMA50 (${formatPairPrice(pair, ema50)})`
    },
    {
      name: '2. Momentum RSI (14)',
      score: rsiVal > 55 && rsiVal < 72 ? 1 : (rsiVal < 45 && rsiVal > 28 ? -1 : 0),
      detail: `RSI saat ini ${rsiVal.toFixed(1)} (${rsiVal > 70 ? 'Overbought/Rawan Koreksi' : rsiVal < 30 ? 'Oversold/Rawan Rebound' : 'Momentum Aktif'})`
    },
    {
      name: '3. Posisi Range Harian',
      score: rangePos > 65 ? 1 : (rangePos < 35 ? -1 : 0),
      detail: `Berada di ${rangePos.toFixed(0)}% dari rentang harian (${formatPairPrice(pair, data.dayLow)} – ${formatPairPrice(pair, data.dayHigh)})`
    },
    {
      name: '4. Kekuatan Dolar (DXY)',
      score: dxy ? (pair.startsWith('USD/') ? (dxy.changePct > 0.15 ? 1 : dxy.changePct < -0.15 ? -1 : 0) : (dxy.changePct < -0.15 ? 1 : dxy.changePct > 0.15 ? -1 : 0)) : 0,
      detail: dxy ? `DXY di ${dxy.price.toFixed(2)} (${dxy.changePct >= 0 ? '+' : ''}${dxy.changePct.toFixed(2)}%)` : 'Data DXY tidak tersedia'
    },
    {
      name: '5. Volatilitas Global (VIX)',
      score: vix ? (vix.price > 24 ? -1 : vix.price < 18 ? 1 : 0) : 0,
      detail: vix ? `CBOE VIX di ${vix.price.toFixed(2)} (${vix.price > 24 ? 'Risk-Off / Ketegangan Tinggi' : 'Risk Appetite Stabil'})` : 'Data VIX tidak tersedia'
    },
    {
      name: '6. Imbal Hasil Obligasi (US10Y)',
      score: us10y ? (us10y.changePct > 1 ? -1 : us10y.changePct < -1 ? 1 : 0) : 0,
      detail: us10y ? `US 10Y Treasury Yield di ${us10y.price.toFixed(2)}% (${us10y.changePct >= 0 ? '+' : ''}${us10y.changePct.toFixed(2)}%)` : 'Data US10Y tidak tersedia'
    }
  ];

  const totalScore = factors.reduce((s, f) => s + f.score, 0);
  let verdict = `MIXED / KONSOLIDASI (${totalScore >= 0 ? '+' : ''}${totalScore}/6 Faktor)`;
  let badgeCls = 'war-badge-neutral';
  if (totalScore >= 3) { verdict = `BULLISH BIAS (+${totalScore}/6 Faktor)`; badgeCls = 'war-badge-bull'; }
  else if (totalScore <= -3) { verdict = `BEARISH BIAS (${totalScore}/6 Faktor)`; badgeCls = 'war-badge-bear'; }

  container.innerHTML = `
    <div class="space-y-3 anim-fade w-full">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="war-badge ${badgeCls}">${esc(verdict)}</span>
          <span class="text-[10px] font-mono text-slate-300 font-bold">${esc(pair)}: ${formatPairPrice(pair, px)} (${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%)</span>
        </div>
        ${STATE.sourceUrl ? `<a href="${esc(STATE.sourceUrl)}" target="_blank" rel="noopener" class="text-[9px] text-cyan-400 hover:underline font-mono"><i class="fas fa-external-link-alt mr-1"></i>Sumber: ${esc(data.exchange || 'Yahoo Finance')} (${esc(data.symbol)})</a>` : ''}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        ${factors.map(f => {
          const tag = f.score > 0 ? '<span class="text-emerald-400 font-bold">+1 Bull</span>' : f.score < 0 ? '<span class="text-red-400 font-bold">-1 Bear</span>' : '<span class="text-amber-400 font-bold">0 Netral</span>';
          return `
            <div class="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800/50">
              <div class="flex justify-between items-center text-[9px] mb-1">
                <span class="font-bold text-slate-200">${esc(f.name)}</span>
                ${tag}
              </div>
              <p class="text-[9px] text-slate-400 leading-snug">${esc(f.detail)}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function populatePairSelectors() {
  const selectors = ['war-pair-select', 'sig-pair-select', 'ai-pair-select'];
  const allOptions = Array.from(new Set([STATE.activePair, ...STATE.watchlist, ...PRESET_PAIRS.map(p => p.pair)]));

  selectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = allOptions.map(p => `<option value="${esc(p)}" ${p === STATE.activePair ? 'selected' : ''}>${esc(p)}</option>`).join('');
  });
}

export function initWarRoom() {
  populatePairSelectors();

  document.getElementById('war-pair-select')?.addEventListener('change', e => {
    setActivePair(e.target.value);
    refreshMarketData(false);
  });

  document.getElementById('war-custom-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('war-custom-input');
    const val = (inp?.value || '').trim().toUpperCase();
    if (!val) return;
    setActivePair(val);
    populatePairSelectors();
    refreshMarketData(false);
  });

  onEvent('watchlist:updated', populatePairSelectors);
  onEvent('pair:changed', () => {
    populatePairSelectors();
    syncChartWidget();
  });
  onEvent('market:updated', () => {
    renderWarRoom();
    syncChartWidget();
  });
}
