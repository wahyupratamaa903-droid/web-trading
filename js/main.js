import { STATE } from './core/state.js';
import { initTabs } from './core/tabs.js';
import { toast } from './core/utils.js';
import { startPriceFeed, refreshMarketData } from './modules/price-feed.js';
import { initWarRoom } from './modules/war-room.js';
import { initSignalEngine } from './modules/signal-engine.js';
import { initSMC } from './modules/smc-toolkit.js';
import { initInstitutional } from './modules/institutional.js';
import { initNewsRadar } from './modules/news-radar.js';
import { initRiskCalc } from './modules/risk-calc.js';
import { initJournal } from './modules/journal.js';
import { initAIRouter } from './modules/ai-router.js';

function initTradingViewChart() {
  if (STATE.chartReady || typeof TradingView === 'undefined') return;
  try {
    new TradingView.widget({
      autosize: true, symbol: 'OANDA:XAUUSD', interval: '60', timezone: 'Asia/Jakarta',
      theme: 'dark', style: '1', locale: 'id', toolbar_bg: '#03030a',
      enable_publishing: false, hide_side_toolbar: true, allow_symbol_change: true, container_id: 'tv_chart'
    });
    STATE.chartReady = true;
  } catch (e) { console.error('[Chart]', e); }
}

function bootTerminal() {
  initTabs(); initWarRoom(); initSignalEngine(); initSMC();
  initInstitutional(); initNewsRadar(); initRiskCalc(); initJournal(); initAIRouter();
  startPriceFeed();
  setTimeout(initTradingViewChart, 250);
  document.getElementById('refresh-btn')?.addEventListener('click', () => refreshMarketData(false));
  toast('🚀 GOLD & DXY v10 Modular Active!', 'success');
}

function handleLogin() {
  const u = document.getElementById('lg-user').value.trim();
  const p = document.getElementById('lg-pass').value;
  const err = document.getElementById('lg-err');
  if (u === 'trader' && p === 'goldrush2024') {
    localStorage.setItem('gd_ses', 'ok');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    err.classList.add('hidden');
    bootTerminal();
  } else { err.classList.remove('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lg-btn')?.addEventListener('click', handleLogin);
  document.getElementById('login-form')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('logout-btn')?.addEventListener('click', () => { localStorage.removeItem('gd_ses'); location.reload(); });
  if (localStorage.getItem('gd_ses') === 'ok') {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    bootTerminal();
  }
});
