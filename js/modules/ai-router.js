import { CONFIG, STATE, setActivePair, onEvent } from '../core/state.js';
import { formatPairPrice } from '../core/pairs.js';
import { esc, renderMarkdown, validateInput, toast } from '../core/utils.js';
import { refreshMarketData } from './price-feed.js';

const POOLS = {
  smart: ['meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-next-80b-a3b-instruct:free', 'openai/gpt-oss-120b:free'],
  premium: ['nousresearch/hermes-3-llama-3.1-405b:free', 'qwen/qwen3-next-80b-a3b-instruct:free', 'openai/gpt-oss-120b:free'],
  fast: ['openai/gpt-oss-20b:free', 'meta-llama/llama-3.2-3b-instruct:free', 'google/gemma-4-26b-a4b-it:free']
};

function getCustomKey() {
  return localStorage.getItem('gd_openrouter_key') || '';
}

function buildDynamicSystemPrompt() {
  const pair = STATE.activePair;
  const style = document.getElementById('ai-style-select')?.value || 'Intraday (H1/H4)';
  const d = STATE.activeData;
  const m = STATE.lastMetrics;
  const dxy = STATE.macro.dxy;
  const vix = STATE.macro.vix;
  const us10y = STATE.macro.us10y;

  let snapshot = `\n[KONTEKS PASAR REAL-TIME AKTIF - PAIR FOKUS: ${pair} | GAYA TRADING: ${style}]`;
  if (d && d.price) {
    snapshot += `\n- Harga ${pair}: ${formatPairPrice(pair, d.price)} (Perubahan Harian: ${(d.changePct || 0).toFixed(2)}%, High: ${formatPairPrice(pair, d.dayHigh)}, Low: ${formatPairPrice(pair, d.dayLow)})`;
  }
  if (m && m.pair === pair && m.rsiVal) {
    snapshot += `\n- Indikator Teknikal (${m.tf}): RSI(${m.rsiP})=${m.rsiVal.toFixed(1)}, EMA(${m.emaFastP})=${formatPairPrice(pair, m.emaFast)}, EMA(${m.emaSlowP})=${formatPairPrice(pair, m.emaSlow)}, MACD=${m.macdLine.toFixed(4)}, ATR(14)=${formatPairPrice(pair, m.atr)}, Pivot=${formatPairPrice(pair, m.pivot)} (R1=${formatPairPrice(pair, m.r1)}, S1=${formatPairPrice(pair, m.s1)})`;
  }
  if (dxy || vix || us10y) {
    snapshot += `\n- Makro Global: DXY=${dxy ? dxy.price.toFixed(2) : 'N/A'}, VIX=${vix ? vix.price.toFixed(2) : 'N/A'}, US10Y=${us10y ? us10y.price.toFixed(2) + '%' : 'N/A'}`;
  }

  return `Kamu adalah AI Trading Analyst & Risk Mentor senior yang menguasai seluruh pasar finansial global (Forex Major/Cross, Komoditas Emas/Perak/Minyak, Kripto, dan Indeks Saham).
Jangan terpaku hanya pada XAU/USD — fokuskan analisis penuh pada PAIR AKTIF yang dipilih pengguna (${pair}) sesuai gaya trading (${style}).
Gunakan Bahasa Indonesia yang tajam, objektif, terstruktur dengan **bold** dan daftar poin. Cantumkan skenario konfirmasi Entry, Stop Loss, Take Profit, serta risiko berita makro yang relevan.${snapshot}`;
}

function appendBubble(role, content, model = null) {
  const chat = document.getElementById('chat');
  if (!chat) return;
  let html = '';
  if (role === 'user') {
    html = `<div class="flex gap-2.5 justify-end anim-fade"><div class="bg-amber-500/12 p-3 rounded-2xl rounded-tr-none border border-amber-500/25 max-w-[85%]"><p class="text-amber-400 font-bold text-[10px] mb-1 text-right">Kamu (${esc(STATE.activePair)})</p><p class="text-slate-200 text-xs leading-relaxed">${esc(content)}</p></div></div>`;
  } else if (role === 'ai') {
    const pill = model ? `<span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-1">${esc(model.split('/').pop())}</span>` : '';
    html = `<div class="flex gap-2.5 anim-fade"><div class="bg-slate-900/60 p-3 rounded-2xl rounded-tl-none border border-slate-800/70 max-w-[92%]"><div class="flex items-center gap-1 mb-2"><p class="text-purple-400 font-bold text-[10px]">AI Mentor</p>${pill}</div><div class="ai-out text-slate-200 text-xs leading-relaxed">${renderMarkdown(content)}</div></div></div>`;
  } else if (role === 'error') {
    html = `<div class="err-box text-xs text-red-300 anim-fade">${esc(content)}</div>`;
  } else {
    html = `<div class="text-center py-1"><span class="text-[9px] font-mono text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full">${esc(content)}</span></div>`;
  }
  chat.insertAdjacentHTML('beforeend', html);
  chat.scrollTop = chat.scrollHeight;
}

export async function sendAIMessage(overrideText = null) {
  if (STATE.loading) return;
  const inp = document.getElementById('u-in');
  const txt = (overrideText ?? inp.value).trim();
  const check = validateInput(txt);
  if (!check.ok) { toast(check.reason, 'warning'); return; }

  const now = Date.now();
  if (now - STATE.lastSend < CONFIG.rateLimitMs) return;
  STATE.lastSend = now;

  appendBubble('user', txt);
  if (!overrideText && inp) inp.value = '';
  STATE.loading = true;

  const sel = document.getElementById('mdl-sel')?.value || 'auto_pilot';
  const models = sel === 'auto_pilot' ? POOLS.smart
    : sel === 'auto_premium' ? POOLS.premium
    : sel === 'auto_fast' ? POOLS.fast
    : [sel];

  const messages = [
    { role: 'system', content: buildDynamicSystemPrompt() },
    ...STATE.hist.slice(-(CONFIG.maxHistory * 2)),
    { role: 'user', content: txt }
  ];

  const customKey = getCustomKey();
  let success = false, reply = '', modelUsed = '', lastErr = '';

  for (const m of models) {
    try {
      let res = await fetch(CONFIG.aiProxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(customKey ? { 'x-custom-key': customKey } : {}) },
        body: JSON.stringify({ model: m, messages, temperature: 0.7, max_tokens: 1800 })
      });

      if (res.status === 404 && customKey) {
        res = await fetch(CONFIG.openRouterDirect, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${customKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.href, 'X-Title': 'GoldDXY-v11' },
          body: JSON.stringify({ model: m, messages, temperature: 0.7, max_tokens: 1800 })
        });
      }

      const d = await res.json();
      if (d.error) { lastErr = d.error.message || JSON.stringify(d.error); continue; }
      if (d.choices?.[0]?.message?.content) {
        success = true; reply = d.choices[0].message.content; modelUsed = d.model || m; break;
      }
    } catch (e) { lastErr = e.message; }
  }

  if (success) {
    STATE.hist.push({ role: 'user', content: txt }, { role: 'assistant', content: reply });
    const hCnt = document.getElementById('h-cnt');
    if (hCnt) hCnt.textContent = Math.floor(STATE.hist.length / 2);
    appendBubble('ai', reply, modelUsed);
  } else {
    appendBubble('error', `Gagal terhubung ke AI Router: ${lastErr}. Pastikan OPENROUTER_API_KEY sudah diisi di Vercel Env atau klik ikon Kunci (🔑) di header.`);
  }
  STATE.loading = false;
}

export function initAIRouter() {
  document.getElementById('ai-pair-select')?.addEventListener('change', e => {
    setActivePair(e.target.value);
    refreshMarketData(false);
  });

  document.getElementById('send-btn')?.addEventListener('click', () => sendAIMessage());
  document.getElementById('u-in')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); } });
  document.getElementById('clear-chat-btn')?.addEventListener('click', () => {
    STATE.hist = [];
    document.getElementById('chat').innerHTML = '';
    appendBubble('sys', '🔄 Sesi chat direset.');
  });

  document.querySelectorAll('.qp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = STATE.activePair;
      const prompts = {
        analisis: `📊 Buatkan analisis teknikal & fundamental lengkap untuk ${p} berdasarkan data live saat ini: arah tren utama, area Support/Resistance kunci, skenario Entry, SL, dan TP.`,
        smc: `🗺️ Petakan struktur SMC (Smart Money Concepts) untuk ${p} saat ini: potensi liquidity sweep, area Order Block, dan validasi BOS/CHoCH.`,
        makro: `🌍 Bagaimana pengaruh sentimen makro global (DXY, US10Y, VIX, dan kebijakan bank sentral terkait) terhadap pergerakan ${p} hari ini?`,
        risk: `🛡️ Buatkan rencana manajemen risiko & pembagian posisi (scaling in/out) yang ideal untuk trading ${p} berdasarkan volatilitas ATR saat ini.`
      };
      const q = prompts[btn.dataset.qp];
      if (q) sendAIMessage(q);
    });
  });

  const modal = document.getElementById('apikey-modal');
  const input = document.getElementById('apikey-input');
  document.getElementById('api-key-btn')?.addEventListener('click', () => {
    if (input) input.value = getCustomKey();
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  });
  document.getElementById('apikey-close')?.addEventListener('click', () => {
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  });
  document.getElementById('apikey-save')?.addEventListener('click', () => {
    if (input) localStorage.setItem('gd_openrouter_key', input.value.trim());
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    toast('🔑 API Key disimpan di browser!', 'success');
  });

  onEvent('ai:prompt', promptText => sendAIMessage(promptText));
}
