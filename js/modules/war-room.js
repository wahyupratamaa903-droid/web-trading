import { STATE, onEvent } from '../core/state.js';
import { esc } from '../core/utils.js';

export function renderWarRoom() {
  const container = document.getElementById('war-room-content');
  if (!container) return;

  const xau = STATE.prices.xau;
  const xauCh = STATE.changes.xau || 0;
  const dxy = STATE.prices.dxy;
  const dxyCh = STATE.changes.dxy || 0;
  const btc = STATE.prices.btc;
  const btcCh = STATE.changes.btc || 0;
  const vix = STATE.assets.vix?.price;
  const us10y = STATE.assets.us10y?.price;

  if (!xau) {
    container.innerHTML = '<p class="text-[10px] text-slate-500 py-3">Menunggu sinkronisasi feed harga real-time...</p>';
    return;
  }

  let bias = 'SIDEWAYS / CONSOLIDATION';
  let badgeCls = 'war-badge-neutral';
  let icon = '⚖️';
  let sentiment = vix && vix > 22 ? 'Risk-OFF (High Vol)' : 'Balanced';

  if (xauCh > 0.25 && dxyCh <= 0) {
    bias = 'BULLISH GOLD'; badgeCls = 'war-badge-bull'; icon = '📈'; sentiment = 'USD Weakening / Gold Bid';
  } else if (xauCh < -0.25 && dxyCh >= 0) {
    bias = 'BEARISH GOLD'; badgeCls = 'war-badge-bear'; icon = '📉'; sentiment = 'USD Strength / Gold Pressure';
  }

  const xauText = xauCh >= 0
    ? `XAU naik +${xauCh.toFixed(2)}% hari ini ($${xau.toFixed(2)}), pembeli menjaga momentum.`
    : `XAU terkoreksi ${xauCh.toFixed(2)}% ($${xau.toFixed(2)}), waspadai tekanan jual intraday.`;

  const dxyText = dxy
    ? (dxyCh >= 0
        ? `DXY menguat +${dxyCh.toFixed(2)}% ke ${dxy.toFixed(2)}, menjadi hambatan kenaikan emas.`
        : `DXY melemah ${dxyCh.toFixed(2)}% ke ${dxy.toFixed(2)}, memberi ruang kenaikan XAU.`)
    : 'Menunggu koneksi DXY server feed (/api/market).';

  const macroText = `Imbal hasil obligasi US10Y berada di ${us10y ? us10y.toFixed(2) + '%' : 'N/A'} dengan indeks volatilitas VIX di ${vix ? vix.toFixed(2) : 'N/A'}. ${
    us10y && us10y > 4.2 ? 'Yield obligasi tinggi cenderung menahan reli emas jangka pendek.' : 'Kondisi yield moderat mendukung aset safe-haven saat DXY melemah.'
  }`;

  const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  container.innerHTML = `
    <div class="space-y-3 anim-fade w-full">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="war-badge ${badgeCls}">${icon} ${bias}</span>
          <span class="war-badge war-badge-neutral">${esc(sentiment)}</span>
        </div>
        <span class="text-[9px] text-slate-500 font-mono">Live Sync: ${timeStr} WIB</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div class="bg-slate-900/45 rounded-lg p-2.5 border border-slate-800/40">
          <p class="text-[8px] text-amber-400 font-bold mb-1">🥇 XAU/USD $${xau.toFixed(2)}</p>
          <p class="text-[10px] text-slate-300">${esc(xauText)}</p>
        </div>
        <div class="bg-slate-900/45 rounded-lg p-2.5 border border-slate-800/40">
          <p class="text-[8px] text-cyan-400 font-bold mb-1">💵 DXY ${dxy ? dxy.toFixed(2) : '--'}</p>
          <p class="text-[10px] text-slate-300">${esc(dxyText)}</p>
        </div>
        <div class="bg-slate-900/45 rounded-lg p-2.5 border border-slate-800/40">
          <p class="text-[8px] text-orange-400 font-bold mb-1">🔥 BTC $${btc ? Math.round(btc).toLocaleString('en-US') : '--'}</p>
          <p class="text-[10px] text-slate-300">Perubahan 24J: ${btcCh >= 0 ? '+' : ''}${btcCh.toFixed(2)}% (barometer risk appetite).</p>
        </div>
      </div>
      <div class="bg-slate-900/35 rounded-lg p-3 border border-slate-800/30">
        <p class="text-[9px] text-slate-400 font-bold mb-1">📊 LIVE MACRO & YIELD BRIEF</p>
        <p class="text-[10px] text-slate-300 leading-relaxed">${esc(macroText)}</p>
      </div>
    </div>
  `;
}

export function initWarRoom() {
  onEvent('market:updated', renderWarRoom);
  document.getElementById('war-refresh')?.addEventListener('click', renderWarRoom);
}
