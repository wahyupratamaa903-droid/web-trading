import { initTabs } from './core/tabs.js';
import { toast } from './core/utils.js';
import { initWatchlistManager, startPriceFeed, refreshMarketData } from './modules/price-feed.js';
import { initWarRoom } from './modules/war-room.js';
import { initSignalEngine } from './modules/signal-engine.js';
import { initSMC } from './modules/smc-toolkit.js';
import { initInstitutional } from './modules/institutional.js';
import { initNewsRadar } from './modules/news-radar.js';
import { initTools } from './modules/tools.js';
import { initAIRouter } from './modules/ai-router.js';

function bootTerminal() {
  initTabs();
  initWatchlistManager();
  initWarRoom();
  initSignalEngine();
  initSMC();
  initInstitutional();
  initNewsRadar();
  initTools();
  initAIRouter();

  startPriceFeed();
  document.getElementById('refresh-btn')?.addEventListener('click', () => refreshMarketData(false));
  toast('🚀 Multi-Market Terminal v11 Aktif!', 'success');
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
  } else {
    err.classList.remove('hidden');
  }
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
