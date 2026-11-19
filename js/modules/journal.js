import { STATE, emitEvent } from '../core/state.js';
import { esc, toast } from '../core/utils.js';
import { switchTab } from '../core/tabs.js';

function saveJournal() {
  try { localStorage.setItem('gd_journal', JSON.stringify(STATE.journal)); }
  catch (e) { toast('⚠️ Penyimpanan lokal penuh', 'warning'); }
}

export function loadJournal() {
  try {
    const raw = localStorage.getItem('gd_journal');
    STATE.journal = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(STATE.journal)) STATE.journal = [];
  } catch (e) { STATE.journal = []; }
}

export function renderJournal() {
  const list = document.getElementById('jn-list');
  const wrDisp = document.getElementById('wr-disp');
  if (!list || !wrDisp) return;

  if (!STATE.journal.length) {
    list.innerHTML = '<p class="text-[10px] text-slate-600 text-center py-3">Belum ada catatan trade</p>';
    wrDisp.textContent = 'WR: 0%';
    return;
  }

  let wins = 0;
  list.innerHTML = [...STATE.journal].reverse().map(e => {
    const win = e.pips > 0;
    if (win) wins++;
    return `
      <div class="j-row flex items-center justify-between text-[10px] border border-slate-800/30 bg-slate-900/35">
        <div class="flex items-center gap-2"><span class="font-bold ${win ? 'text-emerald-400' : 'text-red-400'}">${esc(e.pair)}</span><span class="text-slate-400">${esc(e.side)}</span></div>
        <div class="flex items-center gap-2"><span class="${win ? 'text-emerald-400' : 'text-red-400'} font-bold">${e.pips > 0 ? '+' : ''}${e.pips}p</span><button data-id="${e.id}" class="del-trade text-slate-500 hover:text-red-400 px-1"><i class="fas fa-times"></i></button></div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.del-trade').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.journal = STATE.journal.filter(x => x.id !== Number(btn.dataset.id));
      saveJournal(); renderJournal();
    });
  });

  wrDisp.textContent = `WR: ${(wins / STATE.journal.length * 100).toFixed(0)}% (${wins}/${STATE.journal.length})`;
}

function addTrade() {
  const pair = document.getElementById('jn-pair').value;
  const side = document.getElementById('jn-side').value;
  const pipsRaw = document.getElementById('jn-pips').value;
  const pips = parseFloat(pipsRaw);
  if (!pipsRaw || isNaN(pips)) { toast('⚠️ Masukkan angka pips yang valid', 'warning'); return; }
  STATE.journal.push({ id: Date.now(), pair, side, pips, ts: new Date().toLocaleString('id-ID') });
  saveJournal(); document.getElementById('jn-pips').value = ''; renderJournal();
  toast('📝 Trade dicatat!', 'success');
}

function exportJournal() {
  if (!STATE.journal.length) { toast('⚠️ Jurnal masih kosong', 'warning'); return; }
  const blob = new Blob([JSON.stringify(STATE.journal, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `journal-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
}

function triggerAIJournalReview() {
  if (!STATE.journal.length) { toast('⚠️ Isi minimal 1 riwayat trade dulu', 'warning'); return; }
  const wins = STATE.journal.filter(e => e.pips > 0).length;
  const totalPips = STATE.journal.reduce((acc, e) => acc + e.pips, 0);
  const summary = `DATA JURNAL (${STATE.journal.length} trades): Win ${wins}, Loss ${STATE.journal.length - wins}, Win Rate ${(wins / STATE.journal.length * 100).toFixed(1)}%, Total Pips: ${totalPips}. Riwayat: ${STATE.journal.slice(-10).map(e => `${e.pair} ${e.side} ${e.pips}p`).join(', ')}`;
  switchTab('ai');
  emitEvent('ai:prompt', `Bertindaklah sebagai MENTOR TRADING PROFESIONAL. Evaluasi jurnal trading saya berikut dan berikan kelemahan utama, perbaikan manajemen risiko, dan action plan:\n\n${summary}`);
}

export function initJournal() {
  loadJournal(); renderJournal();
  document.getElementById('add-trade-btn')?.addEventListener('click', addTrade);
  document.getElementById('exp-journal-btn')?.addEventListener('click', exportJournal);
  document.getElementById('analyze-journal-btn')?.addEventListener('click', triggerAIJournalReview);
}
