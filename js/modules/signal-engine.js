import { STATE, onEvent } from '../core/state.js';

function calcEMA(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) ema = values[i] * k + ema * (1 - k);
  return ema;
}

function calcRSI(closes, period = 14) {
  if (closes.length <= period) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
}

function calcATR(candles, period = 14) {
  if (candles.length <= period) return 12;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].h, l = candles[i].l, pc = candles[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function renderSignalEngine() {
  const candles = STATE.xauH1 || [];
  const xau = STATE.prices.xau || (candles.length ? candles[candles.length - 1].c : 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  if (candles.length < 30 || !xau) {
    set('sig-direction', '⏳ MENUNGGU DATA H1');
    set('sig-reason', 'Membutuhkan histori candle H1 dari /api/market untuk menghitung RSI(14), EMA(50/200), dan MACD.');
    return;
  }

  const closes = candles.map(c => c.c);
  const rsi = calcRSI(closes, 14);
  const ema50 = calcEMA(closes, 50) || calcEMA(closes, 20);
  const ema200 = calcEMA(closes, Math.min(200, closes.length - 1));
  const macdLine = calcEMA(closes, 12) - calcEMA(closes, 26);
  const atr = calcATR(candles, 14);

  const bullTrend = xau > ema50 && ema50 >= ema200;
  const bearTrend = xau < ema50 && ema50 <= ema200;

  let dir = '⚖️ WAIT / NEUTRAL', cls = 'signal-neutral', conf = 45, entry = 'Tunggu Konfirmasi', sl = '--', tp = '--';
  let reason = `RSI(14) di ${rsi.toFixed(1)}, harga di sekitar EMA50 ($${ema50.toFixed(1)}). Belum ada konfluensi penuh.`;

  if (bullTrend && rsi >= 45 && rsi <= 68 && macdLine > 0) {
    dir = '📈 BUY SETUP'; cls = 'signal-buy'; conf = Math.min(85, Math.round(60 + (rsi - 45)));
    entry = `$${xau.toFixed(2)}`; sl = `$${(xau - atr * 1.5).toFixed(2)}`; tp = `$${(xau + atr * 2.5).toFixed(2)}`;
    reason = `Uptrend valid: Harga di atas EMA50 ($${ema50.toFixed(1)}), RSI sehat (${rsi.toFixed(1)}), dan MACD positif (+${macdLine.toFixed(2)}).`;
  } else if (bearTrend && rsi <= 55 && rsi >= 32 && macdLine < 0) {
    dir = '📉 SELL SETUP'; cls = 'signal-sell'; conf = Math.min(85, Math.round(60 + (55 - rsi)));
    entry = `$${xau.toFixed(2)}`; sl = `$${(xau + atr * 1.5).toFixed(2)}`; tp = `$${(xau - atr * 2.5).toFixed(2)}`;
    reason = `Downtrend valid: Harga di bawah EMA50 ($${ema50.toFixed(1)}), RSI (${rsi.toFixed(1)}), dan MACD negatif (${macdLine.toFixed(2)}).`;
  }

  const card = document.getElementById('sig-main-card');
  if (card) card.className = `signal-card ${cls} mb-3`;

  set('sig-direction', dir); set('sig-reason', reason); set('sig-conf-val', `${conf}%`);
  const bar = document.getElementById('sig-conf-bar');
  if (bar) bar.style.width = `${conf}%`;

  set('sig-entry', entry); set('sig-sl', sl); set('sig-tp', tp);
  set('sig-rsi', rsi.toFixed(1));
  set('sig-macd', macdLine >= 0 ? `↑ +${macdLine.toFixed(2)}` : `↓ ${macdLine.toFixed(2)}`);
  set('sig-ema', xau > ema50 ? 'Above EMA50' : 'Below EMA50');
  set('sig-vol', `ATR $${atr.toFixed(1)}`);

  const fc6h = document.getElementById('fc-6h');
  const fc24h = document.getElementById('fc-24h');
  const fc7d = document.getElementById('fc-7d');
  if (fc6h) fc6h.innerHTML = `<span class="text-[8px] text-slate-500">H1/6H</span><span class="text-[10px] font-bold ${macdLine >= 0 ? 'text-emerald-400' : 'text-red-400'}">${macdLine >= 0 ? '🟢 Bullish' : '🔴 Bearish'}</span>`;
  if (fc24h) fc24h.innerHTML = `<span class="text-[8px] text-slate-500">24H</span><span class="text-[10px] font-bold ${bullTrend ? 'text-emerald-400' : bearTrend ? 'text-red-400' : 'text-amber-400'}">${bullTrend ? '🟢 Uptrend' : bearTrend ? '🔴 Downtrend' : '🟡 Range'}</span>`;
  if (fc7d) fc7d.innerHTML = `<span class="text-[8px] text-slate-500">ATR VOL</span><span class="text-[10px] font-bold text-cyan-400">$${atr.toFixed(1)}/h</span>`;
}

export function initSignalEngine() {
  onEvent('market:updated', renderSignalEngine);
  document.getElementById('sig-refresh')?.addEventListener('click', renderSignalEngine);
}
