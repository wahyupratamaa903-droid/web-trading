import { CONFIG, STATE, setActivePair, saveWatchlist, emitEvent, onEvent } from '../core/state.js';
import { PRESET_PAIRS, getPairMeta, formatPairPrice } from '../core/pairs.js';
import { esc, toast } from '../core/utils.js';

let priceTimer = null;

export function renderWatchlist() {
  const grid = document.getElementById('watchlist-grid');
  const ticker = document.getElementById('ticker-track');
  if (!grid) return;

  grid.innerHTML = STATE.watchlist.map(pair => {
    const item = STATE.watchlistData[pair];
    const isActive = STATE.activePair === pair;
    const priceStr = item ? formatPairPrice(pair, item.price) : '--';
    const ch = item?.changePct ?? 0;
    const up = ch >= 0;
    const chStr = item ? `${up ? '▲ +' : '▼ '}${ch.toFixed(2)}%` : 'Memuat...';

    return `
      <div data-select-pair="${esc(pair)}" class="glass-card p-3 cursor-pointer relative group ${isActive ? 'border-amber-500/60 glow-card-amber' : ''}">
        <button data-remove-pair="${esc(pair)}" title="Hapus" class="remove-pair-btn absolute top-1.5 right-1.5 text-[10px] text-slate-600 hover:text-red-400 px-1.5 py-0.5 rounded opacity-80">
          <i class="fas fa-times"></i>
        </button>
        <div class="flex items-center gap-1.5 mb-0.5 pr-4">
          <span class="live-dot"></span>
          <p class="text-[10px] font-bold font-mono ${isActive ? 'text-amber-400' : 'text-slate-300'}">${esc(pair)}</p>
        </div>
        <p class="text-sm sm:text-base font-black text-slate-100">${priceStr}</p>
        <p class="text-[10px] font-mono ${up ? 'text-emerald-400' : 'text-red-400'}">${chStr}</p>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-select-pair]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.remove-pair-btn')) return;
      const p = card.dataset.selectPair;
      setActivePair(p);
      renderWatchlist();
      refreshMarketData(true);
      toast(`📌 Pair aktif diubah ke ${p}`, 'info');
    });
  });

  grid.querySelectorAll('.remove-pair-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (STATE.watchlist.length <= 1) { toast('⚠️ Minimal sisakan 1 pair di Watchlist', 'warning'); return; }
      const target = btn.dataset.removePair;
      STATE.watchlist = STATE.watchlist.filter(p => p !== target);
      saveWatchlist();
      if (STATE.activePair === target) setActivePair(STATE.watchlist[0]);
      renderWatchlist();
    });
  });

  if (ticker) {
    const itemsHtml = STATE.watchlist.map(pair => {
      const item = STATE.watchlistData[pair];
      const px = item ? formatPairPrice(pair, item.price) : '--';
      const ch = item?.changePct ?? 0;
      const up = ch >= 0;
      return `<span class="mx-4 font-mono"><b class="text-amber-400">${esc(pair)}</b>: ${px} <span class="${up ? 'text-emerald-400' : 'text-red-400'}">${up ? '▲' : '▼'}${Math.abs(ch).toFixed(2)}%</span></span>`;
    }).join('');
    ticker.innerHTML = itemsHtml + itemsHtml;
  }
}

export async function refreshMarketData(silent = false) {
  if (!silent) toast(`🔄 Menarik data real-time ${STATE.activePair}...`, 'info');
  const icon = document.querySelector('#refresh-btn i');
  if (icon) icon.classList.add('fa-spin');

  try {
    const params = new URLSearchParams({
      pair: STATE.activePair,
      tf: STATE.timeframe,
      watchlist: STATE.watchlist.join(',')
    });

    const [mktRes, fngRes] = await Promise.allSettled([
      fetch(`${CONFIG.marketEndpoint}?${params.toString()}`).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch('https://api.alternative.me/fng/?limit=1').then(r => r.ok ? r.json() : null)
    ]);

    if (fngRes.status === 'fulfilled' && fngRes.value?.data?.[0]) {
      STATE.fng = { value: parseInt(fngRes.value.data[0].value, 10), label: fngRes.value.data[0].value_classification };
    }

    if (mktRes.status === 'fulfilled' && mktRes.value?.ok) {
      const d = mktRes.value;
      STATE.activeData = d.activeData;
      STATE.macro = d.macro || {};
      STATE.watchlistData = { ...STATE.watchlistData, ...(d.watchlist || {}) };
      STATE.sourceInfo = d.source || 'Yahoo Finance Institutional API';
      STATE.sourceUrl = d.sourceUrl || '';

      const badge = document.getElementById('data-source-badge');
      if (badge) badge.textContent = `${STATE.activePair} • ${STATE.sourceInfo}`;

      const timeEl = document.getElementById('update-time');
      if (timeEl) timeEl.textContent = new Date().toTimeString().slice(0, 8);

      renderWatchlist();
      emitEvent('market:updated', STATE);
      if (!silent) toast(`✅ Data ${STATE.activePair} diperbarui!`, 'success');
    }
  } catch (err) {
    if (!silent) toast('⚠️ Gagal mengambil data pasar, coba lagi.', 'warning');
  } finally {
    if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 400);
  }
}

export function initWatchlistManager() {
  const modal = document.getElementById('watchlist-modal');
  const presetGrid = document.getElementById('preset-pair-grid');
  const customInput = document.getElementById('custom-pair-input');

  function renderPresetButtons() {
    if (!presetGrid) return;
    presetGrid.innerHTML = PRESET_PAIRS.map(p => {
      const added = STATE.watchlist.includes(p.pair);
      return `
        <button type="button" data-toggle-pair="${esc(p.pair)}" class="chip-btn ${added ? 'active' : ''} text-left flex items-center justify-between">
          <span>${esc(p.pair)}</span>
          <span>${added ? '✓' : '+'}</span>
        </button>
      `;
    }).join('');

    presetGrid.querySelectorAll('[data-toggle-pair]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pair = btn.dataset.togglePair;
        if (STATE.watchlist.includes(pair)) {
          if (STATE.watchlist.length > 1) STATE.watchlist = STATE.watchlist.filter(x => x !== pair);
        } else {
          if (STATE.watchlist.length >= 12) { toast('Maksimal 12 pair di Watchlist', 'warning'); return; }
          STATE.watchlist.push(pair);
        }
        saveWatchlist();
        renderPresetButtons();
        renderWatchlist();
        refreshMarketData(true);
      });
    });
  }

  document.getElementById('open-watchlist-btn')?.addEventListener('click', () => {
    renderPresetButtons();
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  });

  document.getElementById('close-watchlist-btn')?.addEventListener('click', () => {
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  });

  document.getElementById('add-custom-pair-btn')?.addEventListener('click', () => {
    const val = (customInput?.value || '').trim().toUpperCase();
    if (!val) return;
    const meta = getPairMeta(val);
    if (!STATE.watchlist.includes(meta.pair)) {
      STATE.watchlist.push(meta.pair);
      saveWatchlist();
    }
    setActivePair(meta.pair);
    if (customInput) customInput.value = '';
    renderPresetButtons();
    renderWatchlist();
    refreshMarketData(false);
  });

  onEvent('pair:changed', () => renderWatchlist());
  renderWatchlist();
}

export function startPriceFeed() {
  refreshMarketData(true);
  if (priceTimer) clearInterval(priceTimer);
  priceTimer = setInterval(() => refreshMarketData(true), CONFIG.priceRefreshMs);
}
