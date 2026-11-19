export const CONFIG = {
  aiProxyEndpoint: '/api/ai',
  openRouterDirect: 'https://openrouter.ai/api/v1/chat/completions',
  marketEndpoint: '/api/market',
  newsEndpoint: '/api/news',
  maxHistory: 10,
  rateLimitMs: 1500,
  priceRefreshMs: 30000,
  systemPrompt: `Kamu adalah AI Trading Analyst senior untuk GOLD & DXY Intelligence Terminal v10.
Spesialisasi: XAUUSD (Gold), DXY, analisis teknikal & fundamental tingkat institusional.
Topik: Support/Resistance, Fibonacci, Elliott Wave, SMC, ICT, Liquidity, NFP, CPI, FOMC.
Format: Bahasa Indonesia profesional. Sinyal: 📈 BUY / 📉 SELL + Entry + SL + TP + Confidence.
Gunakan **bold**, - list. Padat, presisi, langsung ke inti analisis.`
};

export const STATE = {
  loading: false,
  chartReady: false,
  dataSource: 'Menghubungkan...',
  assets: {},
  xauH1: [],
  fng: null,
  news: [],
  prices: { xau: 0, dxy: 0, eur: 0, btc: 0 },
  changes: { xau: 0, dxy: 0, eur: 0, btc: 0 },
  hist: [],
  journal: [],
  lastSend: 0
};

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
