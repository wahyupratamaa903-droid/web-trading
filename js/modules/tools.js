import { STATE, emitEvent } from '../core/state.js';
import { PRESET_PAIRS, getPairMeta } from '../core/pairs.js';
import { esc, toast } from '../core/utils.js';
import { switchTab } from '../core/tabs.js';

export function calcRiskPro() {
  const pair = document.getElementById('rc-pair')?.value || 'XAU/USD';
  const meta = getPairMeta(pair);
  const bal = parseFloat(document.getElementById('rc-bal')?.value) || 0;
  const rskPct = parseFloat(document.getElementById('rc-rsk')?.value) || 0;
  const slPips = Math.max(parseFloat(document.getElementById('rc-sl')?.value) || 1, 0.1);
  const tpPips = Math.max(parseFloat(document.getElementById('rc-tp')?.value) || 1, 0.1);
  const lev = Math.max(parseFloat(document.getElementById('rc-lev')?.value) || 100, 1);

  const riskUsd = bal * (rskPct / 100);
  const pipValPerLot = meta.pipVal || 10;
  const lot = riskUsd / (slPips * pipValPerLot);
  const rr = tpPips / slPips;
  const profitUsd = lot * tpPips * pipValPerLot;
  const estMargin = (lot * 100000) / lev;
  const minWinRate = (1 / (1 + rr)) * 100;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('rc-amt', '$' + riskUsd.toFixed(2));
  set('rc-lot', lot.toFixed(2) + ' Lot');
  set('rc-rr', '1:' + rr.toFixed(2));
  set('rc-pft', '$' + profitUsd.toFixed(2));
  set('rc-margin', '$' + estMargin.toFixed(2));
  set('rc-be-wr', minWinRate.toFixed(1) + '%');
  set('rc-pip-info', `Pip Value (${pair}): $${pipValPerLot}/pip per 1.00 lot`);
}

function saveJournal() {
  try { localStorage.setItem('gd_journal_v11', JSON.stringify(STATE.journal)); }
  catch (e) { toast('⚠️ Penyimpanan penuh', 'warning'); }
}

function loadJournal() {
  try {
    const raw = localStorage.getItem('gd_journal_v11') || localStorage.getItem('gd_journal');
    STATE.journal = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(STATE.journal)) STATE.journal = [];
  } catch (e) { STATE.journal = []; }
}

export function renderJournal() {
  const list = document.getElementById('jn-list');
  const statsBox = document.getElementById('jn-stats-grid');
  if (!list) return;

  const total = STATE.journal.length;
  const wins = STATE.journal.filter(e => (e.pnl ?? e.pips) > 0);
  const losses = STATE.journal.filter(e => (e.pnl ?? e.pips) < 0);
  const netPnl = STATE.journal.reduce((s, e) => s + (Number(e.pnl) || 0), 0);
  const netPips = STATE.journal.reduce((s, e) => s + (Number(e.pips) || 0), 0);
  const grossWin = wins.reduce((s, e) => s + Math.abs(Number(e.pnl ?? e.pips) || 0), 0);
  const grossLoss = losses.reduce((s, e) => s + Math.abs(Number(e.pnl ?? e.pips) || 0), 0);
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? '∞' : '0.00') : (grossWin / grossLoss).toFixed(2);
  const winRate = total ? ((wins.length / total) * 100).toFixed(1) : '0.0';

  if (statsBox) {
    statsBox.innerHTML = `
      <div class="bg-slate-900/50 p-2 rounded-lg text-center border border-slate-800/50"><p class="text-[8px] text-slate-400">Win Rate</p><p class="text-xs font-black text-amber-400">${winRate}%</p></div>
      <div class="bg-slate-900/50 p-2 rounded-lg text-center border border-slate-800/50"><p class="text-[8px] text-slate-400">Net P&amp;L</p><p class="text-xs font-black ${netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}</p></div>
      <div class="bg-slate-900/50 p-2 rounded-lg text-center border border-slate-800/50"><p class="text-[8px] text-slate-400">Profit Factor</p><p class="text-xs font-black text-cyan-400">${profitFactor}</p></div>
      <div class="bg-slate-900/50 p-2 rounded-lg text-center border border-slate-800/50"><p class="text-[8px] text-slate-400">Total Pips</p><p class="text-xs font-black ${netPips >= 0 ? 'text-emerald-400' : 'text-red-400'}">${netPips >= 0 ? '+' : ''}${netPips}</p></div>
    `;
  }

  if (!total) {
    list.innerHTML = '<p class="text-[10px] text-slate-500 text-center py-4">Belum ada catatan trade. Catat hasil transaksi untuk evaluasi statistik &amp; AI Mentor.</p>';
    return;
  }

  list.innerHTML = [...STATE.journal].reverse().map(e => {
    const val = e.pnl ?? e.pips;
    const win = val > 0;
    return `
      <div class="p-2.5 rounded-xl border border-slate-800/50 bg-slate-900/45 text-[10px]">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-black ${win ? 'text-emerald-400' : 'text-red-400'}">${esc(e.pair)}</span>
            <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[8px] font-bold">${esc(e.side)} ${e.lot ? e.lot + 'L' : ''}</span>
            ${e.setup ? `<span class="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[8px]">${esc(e.setup)}</span>` : ''}
            ${e.session ? `<span class="text-[8px] text-slate-500">${esc(e.session)}</span>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold ${win ? 'text-emerald-400' : 'text-red-400'}">${e.pips > 0 ? '+' : ''}${e.pips}p ${e.pnl != null ? `($${Number(e.pnl).toFixed(2)})` : ''}</span>
            <button data-del-id="${e.id}" class="text-slate-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        ${e.note ? `<p class="text-[9px] text-slate-400 italic">"${esc(e.note)}"</p>` : ''}
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-del-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.journal = STATE.journal.filter(x => x.id !== Number(btn.dataset.delId));
      saveJournal();
      renderJournal();
    });
  });
}

function addJournalEntry() {
  const pair = (document.getElementById('jn-pair')?.value || 'XAU/USD').trim().toUpperCase();
  const side = document.getElementById('jn-side')?.value || 'BUY';
  const lot = parseFloat(document.getElementById('jn-lot')?.value) || 0.1;
  const pips = parseFloat(document.getElementById('jn-pips')?.value);
  const pnlInput = document.getElementById('jn-pnl')?.value;
  const setup = document.getElementById('jn-setup')?.value || '';
  const session = document.getElementById('jn-session')?.value || '';
  const note = (document.getElementById('jn-note')?.value || '').trim();

  if (isNaN(pips)) { toast('⚠️ Masukkan jumlah pips (contoh: 35 atau -20)', 'warning'); return; }

  const meta = getPairMeta(pair);
  const pnl = pnlInput !== '' && !isNaN(parseFloat(pnlInput))
    ? parseFloat(pnlInput)
    : Number((pips * lot * (meta.pipVal || 10)).toFixed(2));

  STATE.journal.push({
    id: Date.now(), pair, side, lot, pips, pnl, setup, session, note,
    ts: new Date().toLocaleString('id-ID')
  });

  saveJournal();
  document.getElementById('jn-pips').value = '';
  document.getElementById('jn-pnl').value = '';
  document.getElementById('jn-note').value = '';
  renderJournal();
  toast('📝 Transaksi tersimpan di Jurnal!', 'success');
}

function exportJournalCSV() {
  if (!STATE.journal.length) { toast('⚠️ Jurnal masih kosong', 'warning'); return; }
  const headers = ['Waktu', 'Pair', 'Side', 'Lot', 'Pips', 'PnL_USD', 'Setup', 'Session', 'Catatan'];
  const rows = STATE.journal.map(e => [
    `"${e.ts}"`, e.pair, e.side, e.lot || '', e.pips, e.pnl ?? '', `"${e.setup || ''}"`, `"${e.session || ''}"`, `"${(e.note || '').replace(/"/g, "'")}"`
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trading-journal-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function evaluateJournalWithAI() {
  if (!STATE.journal.length) { toast('⚠️ Catat minimal 1 transaksi dulu', 'warning'); return; }
  const summary = STATE.journal.slice(-15).map(e =>
    `${e.pair} ${e.side} (${e.lot || 0.1} lot): ${e.pips} pips / $${e.pnl ?? 0} [Setup: ${e.setup || '-'}, Sesi: ${e.session || '-'}, Catatan: ${e.note || '-'}]`
  ).join('\n');

  switchTab('ai');
  emitEvent('ai:prompt', `Bertindaklah sebagai MENTOR & RISK MANAGER TRADING PROFESIONAL. Evaluasi jurnal trading saya berikut (identifikasi pola kesalahan psikologis/teknikal, rasio risiko, sesi terbaik, dan rencana perbaikan konkret):\n\n${summary}`);
}

export function initTools() {
  const rcPair = document.getElementById('rc-pair');
  if (rcPair) {
    rcPair.innerHTML = PRESET_PAIRS.map(p => `<option value="${esc(p.pair)}">${esc(p.pair)} (${esc(p.name)})</option>`).join('');
  }

  ['rc-pair', 'rc-bal', 'rc-rsk', 'rc-sl', 'rc-tp', 'rc-lev'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcRiskPro);
    document.getElementById(id)?.addEventListener('change', calcRiskPro);
  });
  document.getElementById('calc-btn')?.addEventListener('click', calcRiskPro);
  calcRiskPro();

  loadJournal();
  renderJournal();
  document.getElementById('add-trade-btn')?.addEventListener('click', addJournalEntry);
  document.getElementById('exp-journal-btn')?.addEventListener('click', exportJournalCSV);
  document.getElementById('analyze-journal-btn')?.addEventListener('click', evaluateJournalWithAI);
}
