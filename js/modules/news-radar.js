import { CONFIG, STATE } from '../core/state.js';
import { esc } from '../core/utils.js';

function scoreHeadline(title) {
  const t = title.toLowerCase();
  const bull = ['gold rises', 'gold gains', 'gold surges', 'fed cut', 'rate cut', 'dovish', 'inflation cools', 'dollar falls', 'dxy drops', 'safe-haven'];
  const bear = ['gold falls', 'gold drops', 'gold slides', 'hawkish', 'rate hike', 'dollar rises', 'dollar rallies', 'dxy gains', 'yields surge', 'nfp beats'];
  if (bull.some(w => t.includes(w))) return { cls: 'sentiment-bull', badge: 'BULLISH XAU', imp: 'impact-high' };
  if (bear.some(w => t.includes(w))) return { cls: 'sentiment-bear', badge: 'BEARISH XAU', imp: 'impact-high' };
  return { cls: 'sentiment-neutral', badge: 'MARKET NEWS', imp: 'impact-med' };
}

export async function refreshNewsRadar() {
  const list = document.getElementById('sentiment-list');
  if (!list) return;

  try {
    const res = await fetch(CONFIG.newsEndpoint);
    if (!res.ok) throw new Error('News API unavailable');
    const data = await res.json();
    if (!data.ok || !data.items?.length) throw new Error('No headlines');

    STATE.news = data.items;
    list.innerHTML = data.items.map(item => {
      const sc = scoreHeadline(item.title);
      return `
        <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" class="block sentiment-item ${sc.cls} hover:opacity-90 transition">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-[8px] font-mono text-slate-400">${esc(item.source)}</span>
            <span class="impact-badge ${sc.imp}">${sc.badge}</span>
          </div>
          <p class="text-[10px] font-semibold text-slate-200 leading-snug">${esc(item.title)}</p>
          <p class="text-[8px] text-slate-500 mt-1">${esc(item.pubDate)}</p>
        </a>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = '<div class="p-3 rounded-xl bg-slate-900/40 border border-slate-800/40 text-[10px] text-slate-400">Feed berita live aktif setelah deploy ke Vercel (<code>/api/news</code>).</div>';
  }
}

export function initNewsRadar() {
  refreshNewsRadar();
  document.getElementById('news-refresh-btn')?.addEventListener('click', refreshNewsRadar);
}
