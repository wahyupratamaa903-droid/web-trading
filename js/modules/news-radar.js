import { CONFIG, STATE } from '../core/state.js';
import { esc } from '../core/utils.js';

export function renderNewsList() {
  const list = document.getElementById('sentiment-list');
  if (!list) return;

  const filtered = STATE.news.filter(item => {
    if (STATE.newsColorFilter === 'ALL') return true;
    return item.impactLevel === STATE.newsColorFilter;
  });

  if (!filtered.length) {
    list.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-4">Tidak ada berita pada kategori warna filter ini. Pilih <b>Semua Warna</b> atau muat ulang topik.</p>`;
    return;
  }

  list.innerHTML = filtered.map(item => {
    const impCls = `imp-${item.impactLevel}`;
    const badgeCls = `badge-${item.impactLevel}`;
    const sentColor = item.sentimentDir === 'bull' ? 'text-emerald-400' : item.sentimentDir === 'bear' ? 'text-red-400' : 'text-slate-400';

    return `
      <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" class="block news-card ${impCls} hover:opacity-95 transition">
        <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <span class="text-[8px] font-mono text-cyan-400 font-bold"><i class="fas fa-newspaper mr-1"></i>${esc(item.source)}</span>
          <span class="impact-badge ${badgeCls}">${esc(item.impactLabel)}</span>
        </div>
        <p class="text-[10px] font-semibold text-slate-100 leading-snug mb-1">${esc(item.title)}</p>
        <div class="flex items-center justify-between text-[8px] text-slate-500 font-mono">
          <span class="${sentColor} font-bold">${esc(item.sentimentText)}</span>
          <span>${esc(item.pubDate)}</span>
        </div>
      </a>
    `;
  }).join('');
}

export async function fetchNewsByTopic(topic = 'ALL') {
  STATE.newsTopic = topic;
  const list = document.getElementById('sentiment-list');
  const aggEl = document.getElementById('news-source-aggregator');
  if (list) list.innerHTML = '<p class="text-[10px] text-slate-400 py-3 text-center">Menelusuri sumber berita terpercaya...</p>';

  try {
    const res = await fetch(`${CONFIG.newsEndpoint}?topic=${encodeURIComponent(topic)}`);
    if (!res.ok) throw new Error('News API error');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Gagal memuat berita');

    STATE.news = data.items || [];
    if (aggEl) aggEl.textContent = `Agregator Terverifikasi: ${data.aggregator}`;
    renderNewsList();
  } catch (err) {
    if (list) list.innerHTML = `<p class="text-[10px] text-red-400 p-3">Gagal memuat berita untuk ${esc(topic)}.</p>`;
  }
}

export function initNewsRadar() {
  document.querySelectorAll('[data-news-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-news-topic]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fetchNewsByTopic(btn.dataset.newsTopic);
    });
  });

  document.getElementById('news-search-btn')?.addEventListener('click', () => {
    const q = (document.getElementById('news-custom-input')?.value || '').trim();
    if (q) {
      document.querySelectorAll('[data-news-topic]').forEach(b => b.classList.remove('active'));
      fetchNewsByTopic(q);
    }
  });

  document.querySelectorAll('[data-news-color]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-news-color]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.newsColorFilter = btn.dataset.newsColor;
      renderNewsList();
    });
  });

  document.getElementById('news-refresh-btn')?.addEventListener('click', () => fetchNewsByTopic(STATE.newsTopic));
  fetchNewsByTopic('ALL');
}
