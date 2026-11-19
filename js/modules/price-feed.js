import { CONFIG, STATE, emitEvent } from '../core/state.js';
import { toast } from '../core/utils.js';

let priceTimer = null;

function updateWatchlistCard(key, price, change) {
  const elPx = document.getElementById(`w-${key}-px`);
  const elCh = document.getElementById(`w-${key}-ch`);
  if (!elPx || !elCh || !price) return;

  const old = parseFloat(elPx.dataset.lastPx || 0);
  const fmt = key === 'btc'
    ? '$' + Math.round(price).toLocaleString('en-US')
    : key === 'xau'
      ? '$' + price.toFixed(2)
      : price.toFixed(key === 'dxy' ? 2 : 4);

  elPx.textContent = fmt;
  elPx.dataset.lastPx = price;

  if (old > 0 && old !== price) {
    elPx.classList.remove('flash-g', 'flash-r');
    void elPx.offsetWidth;
    elPx.classList.add(price > old ? 'flash-g' : 'flash-r');
  }

  const up = change >= 0;
  elCh.innerHTML = `${up ? '<i class="fas fa-caret-up mr-0.5"></i>' : '<i class="fas fa-caret-down mr-0.5"></i>'}${up ? '+' : ''}${change.toFixed(2)}%`;
  elCh.className = 'text-[10px] ' + (up ? 'text-emerald-400' : 'text-red-400');

  STATE.prices[key] = price;
  STATE.changes[key] = change;

  const tkFmt = key === 'btc' ? '$' + Math.round(price).toLocaleString('en-US') : key === 'xau' ? '$' + price.toFixed(1) : price.toFixed(key === 'dxy' ? 2 : 4);
  const badge = `${tkFmt} <span class="${up ? 'text-emerald-400' : 'text-red-400'}">${up ? '▲' : '▼'}${Math.abs(change).toFixed(2)}%</span>`;
  [`tk-${key}`, `tk-${key}2`].forEach(id => {
    const t = document.getElementById(id);
    if (t) t.innerHTML = badge;
  });
}

async function fetchDirectFallbacks() {
  const [cgRes, fxRes, fngRes] = await Promise.allSettled([
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold&vs_currencies=usd&include_24hr_change=true').then(r => r.json()),
    fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.json()),
    fetch('https://api.alternative.me/fng/?limit=1').then(r => r.json())
  ]);

  if (cgRes.status === 'fulfilled') {
    if (cgRes.value?.bitcoin) updateWatchlistCard('btc', cgRes.value.bitcoin.usd, cgRes.value.bitcoin.usd_24h_change || 0);
    if (cgRes.value?.['pax-gold']) updateWatchlistCard('xau', cgRes.value['pax-gold'].usd, cgRes.value['pax-gold'].usd_24h_change || 0);
  }
  if (fxRes.status === 'fulfilled' && fxRes.value?.rates?.EUR) {
    updateWatchlistCard('eur', 1 / fxRes.value.rates.EUR, 0);
  }
  if (fngRes.status === 'fulfilled' && fngRes.value?.data?.[0]) {
    STATE.fng = { value: parseInt(fngRes.value.data[0].value, 10), label: fngRes.value.data[0].value_classification };
  }
}

export async function refreshMarketData(silent = false) {
  if (!silent) toast('🔄 Menarik data real-time pasar...', 'info');
  const icon = document.querySelector('#refresh-btn i');
  if (icon) icon.classList.add('fa-spin');

  try {
    const [mktRes, fngRes] = await Promise.allSettled([
      fetch(CONFIG.marketEndpoint).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('https://api.alternative.me/fng/?limit=1').then(r => r.ok ? r.json() : null)
    ]);

    if (fngRes.status === 'fulfilled' && fngRes.value?.data?.[0]) {
      STATE.fng = { value: parseInt(fngRes.value.data[0].value, 10), label: fngRes.value.data[0].value_classification };
    }

    if (mktRes.status === 'fulfilled' && mktRes.value?.ok) {
      const { assets, xauH1, source } = mktRes.value;
      STATE.assets = assets || {};
      STATE.xauH1 = xauH1 || [];
      STATE.dataSource = source || 'Live Server Feed';

      ['xau', 'dxy', 'eur', 'btc'].forEach(key => {
        if (assets[key]?.price) updateWatchlistCard(key, assets[key].price, assets[key].changePct || 0);
      });
    } else {
      STATE.dataSource = 'Public CORS Feed (PAXG/CG)';
      await fetchDirectFallbacks();
    }

    const srcBadge = document.getElementById('data-source-badge');
    if (srcBadge) srcBadge.textContent = STATE.dataSource;

    const timeEl = document.getElementById('update-time');
    if (timeEl) timeEl.textContent = new Date().toTimeString().slice(0, 8);

    emitEvent('market:updated', STATE);
    if (!silent) toast('✅ Data pasar real-time diperbarui!', 'success');
  } catch (err) {
    if (!silent) toast('⚠️ Gagal memuat sebagian data', 'warning');
  } finally {
    if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 400);
  }
}

export function startPriceFeed() {
  refreshMarketData(true);
  if (priceTimer) clearInterval(priceTimer);
  priceTimer = setInterval(() => refreshMarketData(true), CONFIG.priceRefreshMs);
}
