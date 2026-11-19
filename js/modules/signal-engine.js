import { STATE, setActivePair, onEvent } from '../core/state.js';
import { getPairMeta, formatPairPrice } from '../core/pairs.js';
import { esc } from '../core/utils.js';
import { refreshMarketData } from './price-feed.js';

function calcSMA(vals, p) {
  if (vals.length < p) return null;
  return vals.slice(-p).reduce((a, b) => a + b, 0) / p;
}

function calcEMA(vals, p) {
  if (vals.length < p) return null;
  const k = 2 / (p + 1);
  let e = vals.slice(0, p).reduce((a, b) => a + b, 0) / p;
  for (let i = p; i < vals.length; i++) e = vals[i] * k + e * (1 - k);
  return e;
}

function calcRSI(closes, p = 14) {
  if (closes.length <= p) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let ag = g / p, al = l / p;
  for (let i = p + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p;
    al = (al * (p - 1) + (d < 0 ? -d : 0)) / p;
  }
  return al === 0 ? 100 : 100 - (100 / (1 + ag / al));
}

function calcBollinger(closes, p = 20, mult = 2) {
  if (closes.length < p) return null;
  const slice = closes.slice(-p);
  const mean = slice.reduce((a, b) => a + b, 0) / p;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / p;
  const sd = Math.sqrt(variance);
  return { upper: mean + mult * sd, middle: mean, lower: mean - mult * sd };
}

function calcStochastic(candles, kPeriod = 14) {
  if (candles.length < kPeriod) return null;
  const slice = candles.slice(-kPeriod);
  const low = Math.min(...slice.map(c => c.l));
  const high = Math.max(...slice.map(c => c.h));
  const close = slice[slice.length - 1].c;
  return high === low ? 50 : ((close - low) / (high - low)) * 100;
}

function calcCCI(candles, p = 20) {
  if (candles.length < p) return null;
  const slice = candles.slice(-p);
  const tps = slice.map(c => (c.h + c.l + c.c) / 3);
  const mean = tps.reduce((a, b) => a + b, 0) / p;
  const meanDev = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / p;
  return meanDev === 0 ? 0 : (tps[tps.length - 1] - mean) / (0.015 * meanDev);
}

function calcWilliamsR(candles, p = 14) {
  if (candles.length < p) return null;
  const slice = candles.slice(-p);
  const high = Math.max(...slice.map(c => c.h));
  const low = Math.min(...slice.map(c => c.l));
  const close = slice[slice.length - 1].c;
  return high === low ? -50 : ((high - close) / (high - low)) * -100;
}

function calcATR(candles, p = 14) {
  if (candles.length <= p) return 0;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].h, l = candles[i].l, pc = candles[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.slice(-p).reduce((a, b) => a + b, 0) / p;
}

export function renderTradingViewTechnicalGauge() {
  const wrap = document.getElementById('tv-ta-widget');
  if (!wrap) return;
  const meta = getPairMeta(STATE.activePair);
  const intervalMap = { '15m': '15m', '60m': '1h', '1d': '1D' };
  const tvInterval = intervalMap[STATE.timeframe] || '1h';

  wrap.innerHTML = '';
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
  script.async = true;
  script.text = JSON.stringify({
    interval: tvInterval,
    width: '100%',
    isTransparent: true,
    height: 380,
    symbol: meta.tv,
    showIntervalTabs: true,
    displayMode: 'single',
    locale: 'id',
    colorTheme: 'dark'
  });
  wrap.appendChild(script);
}

export function renderSignalEngine() {
  const data = STATE.activeData;
  const pair = STATE.activePair;
  const grid = document.getElementById('custom-indicators-grid');
  const srcEl = document.getElementById('sig-source-info');

  if (!data || !data.candles || data.candles.length < 25) {
    if (grid) grid.innerHTML = '<p class="text-[10px] text-slate-400 col-span-2">Menunggu histori OHLC nyata dari server...</p>';
    return;
  }

  const candles = data.candles;
  const closes = candles.map(c => c.c);
  const px = data.price;

  const emaFastP = Math.max(2, parseInt(document.getElementById('ind-ema-fast')?.value || '20', 10));
  const emaSlowP = Math.max(5, parseInt(document.getElementById('ind-ema-slow')?.value || '50', 10));
  const rsiP = Math.max(2, parseInt(document.getElementById('ind-rsi-p')?.value || '14', 10));

  const emaFast = calcEMA(closes, emaFastP);
  const emaSlow = calcEMA(closes, emaSlowP);
  const sma200 = calcSMA(closes, Math.min(200, closes.length));
  const rsiVal = calcRSI(closes, rsiP);
  const macdLine = (calcEMA(closes, 12) || px) - (calcEMA(closes, 26) || px);
  const bb = calcBollinger(closes, 20, 2);
  const stochK = calcStochastic(candles, 14);
  const cci = calcCCI(candles, 20);
  const willR = calcWilliamsR(candles, 14);
  const atr = calcATR(candles, 14);

  const prev = candles[candles.length - 2];
  const pivot = (prev.h + prev.l + prev.c) / 3;
  const r1 = 2 * pivot - prev.l;
  const s1 = 2 * pivot - prev.h;

  STATE.lastMetrics = { pair, tf: STATE.timeframe, price: px, emaFastP, emaFast, emaSlowP, emaSlow, rsiP, rsiVal, macdLine, atr, pivot, r1, s1 };

  if (srcEl) {
    srcEl.innerHTML = `Sumber Data OHLC: <b class="text-emerald-400">${esc(data.exchange || 'Yahoo Finance')} (${esc(data.symbol)})</b> • ${candles.length} candle (${esc(STATE.timeframe)})`;
  }

  const indicators = [
    { name: `EMA (${emaFastP})`, val: formatPairPrice(pair, emaFast), sig: px > emaFast ? 'BULLISH (Harga di atas)' : 'BEARISH (Harga di bawah)', up: px > emaFast },
    { name: `EMA (${emaSlowP})`, val: formatPairPrice(pair, emaSlow), sig: px > emaSlow ? 'BULLISH (Harga di atas)' : 'BEARISH (Harga di bawah)', up: px > emaSlow },
    { name: `SMA (${Math.min(200, closes.length)})`, val: formatPairPrice(pair, sma200), sig: px > sma200 ? 'UPTREND JANGKA PANJANG' : 'DOWNTREND JANGKA PANJANG', up: px > sma200 },
    { name: `RSI (${rsiP})`, val: rsiVal.toFixed(2), sig: rsiVal > 70 ? 'OVERBOUGHT (>70)' : rsiVal < 30 ? 'OVERSOLD (<30)' : rsiVal > 50 ? 'BULLISH MOMENTUM' : 'BEARISH MOMENTUM', up: rsiVal >= 50 && rsiVal <= 70 },
    { name: 'MACD (12,26)', val: macdLine.toFixed(4), sig: macdLine >= 0 ? 'POSITIVE / BULLISH' : 'NEGATIVE / BEARISH', up: macdLine >= 0 },
    { name: 'Bollinger (20,2)', val: `${formatPairPrice(pair, bb.lower)} - ${formatPairPrice(pair, bb.upper)}`, sig: px > bb.upper ? 'BREAK UPPER BAND' : px < bb.lower ? 'TOUCH LOWER BAND' : 'INSIDE BANDS', up: px >= bb.middle },
    { name: 'Stochastic %K (14)', val: stochK.toFixed(1), sig: stochK > 80 ? 'OVERBOUGHT' : stochK < 20 ? 'OVERSOLD' : stochK > 50 ? 'BULLISH' : 'BEARISH', up: stochK >= 50 },
    { name: 'CCI (20)', val: cci.toFixed(1), sig: cci > 100 ? 'STRONG UPTREND' : cci < -100 ? 'STRONG DOWNTREND' : 'NORMAL RANGE', up: cci >= 0 },
    { name: 'Williams %R (14)', val: willR.toFixed(1), sig: willR > -20 ? 'OVERBOUGHT' : willR < -80 ? 'OVERSOLD' : 'NETRAL', up: willR >= -50 },
    { name: 'ATR (14) & Pivot', val: `${formatPairPrice(pair, atr)} | P: ${formatPairPrice(pair, pivot)}`, sig: `R1: ${formatPairPrice(pair, r1)} • S1: ${formatPairPrice(pair, s1)}`, up: px >= pivot }
  ];

  if (grid) {
    grid.innerHTML = indicators.map(ind => `
      <div class="bg-slate-900/55 rounded-xl p-2.5 border border-slate-800/50">
        <div class="flex justify-between items-center mb-1">
          <span class="text-[9px] font-bold text-slate-400">${esc(ind.name)}</span>
          <span class="text-[9px] font-mono font-bold ${ind.up ? 'text-emerald-400' : 'text-red-400'}">${esc(ind.val)}</span>
        </div>
        <p class="text-[9px] font-semibold ${ind.up ? 'text-emerald-300/90' : 'text-amber-300/90'}">${esc(ind.sig)}</p>
      </div>
    `).join('');
  }
}

export function initSignalEngine() {
  document.getElementById('sig-pair-select')?.addEventListener('change', e => {
    setActivePair(e.target.value);
    refreshMarketData(false);
  });

  document.getElementById('sig-tf-select')?.addEventListener('change', e => {
    STATE.timeframe = e.target.value;
    refreshMarketData(false);
  });

  ['ind-ema-fast', 'ind-ema-slow', 'ind-rsi-p'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderSignalEngine);
  });

  onEvent('market:updated', () => {
    renderSignalEngine();
    renderTradingViewTechnicalGauge();
  });
}
