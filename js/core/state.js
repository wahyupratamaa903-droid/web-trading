import { getPairMeta } from './pairs.js';

const savedWatchlist = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem('gd_watchlist_v11'));
    if (Array.isArray(raw) && raw.length > 0) return raw;
  } catch (e) {}
  return ['XAU/USD', 'DXY', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD'];
})();

export const CONFIG = {
  aiProxyEndpoint: '/api/ai',
  openRouterDirect: 'https://openrouter.ai/api/v1/chat/completions',
  marketEndpoint: '/api/market',
  newsEndpoint: '/api/news',
  maxHistory: 10,
  rateLimitMs: 1500,
  priceRefreshMs: 30000
};

export const STATE = {
  activePair: localStorage.getItem('gd_active_pair_v11') || 'XAU/USD',
  timeframe: '60m',
  watchlist: savedWatchlist,
  watchlistData: {},
  activeData: null,
  macro: {},
  fng: null,
  news: [],
  newsTopic: 'ALL',
  newsColorFilter: 'ALL',
  sourceInfo: 'Menghubungkan...',
  sourceUrl: '',
  lastMetrics: {},
  hist: [],
  journal: [],
  loading: false,
  lastSend: 0
};

export function setActivePair(newPair) {
  const meta = getPairMeta(newPair);
  STATE.activePair = meta.pair;
  localStorage.setItem('gd_active_pair_v11', meta.pair);
  emitEvent('pair:changed', meta);
}

export function saveWatchlist() {
  localStorage.setItem('gd_watchlist_v11', JSON.stringify(STATE.watchlist));
  emitEvent('watchlist:updated', STATE.watchlist);
}

const listeners = {};
export function onEvent(eventName, callback) {
  if (!listeners[eventName]) listeners[eventName] = [];
  listeners[eventName].push(callback);
}
export function emitEvent(eventName, payload) {
  (listeners[eventName] || []).forEach(fn => {
    try { fn(payload); } catch (err) { console.error(`[Event:${eventName}]`, err); }
  });
}
