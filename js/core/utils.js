export function esc(s) {
  if (typeof s !== 'string') return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

export function renderMarkdown(raw) {
  let s = esc(raw);
  s = s.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950 p-2 rounded-lg overflow-x-auto text-[11px] my-1"><code>$1</code></pre>');
  s = s.replace(/`([^`\n]{1,200})`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*\n]{1,300})\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]{1,200})\*/g, '<em>$1</em>');
  s = s.replace(/^### (.+)$/gm, '<h3 class="text-amber-400 font-bold mt-2 mb-1">$1</h3>');
  s = s.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  s = s.replace(/\n{2,}/g, '</p><p class="mt-2">');
  s = s.replace(/\n/g, '<br>');
  return '<p>' + s + '</p>';
}

export function validateInput(t) {
  if (!t || !t.trim()) return { ok: false, reason: 'Pesan kosong' };
  if (t.length > 2000) return { ok: false, reason: 'Maksimal 2000 karakter' };
  if (/<\s*script|javascript\s*:|on\w+\s*=|data\s*:\s*text\s*\/\s*html/i.test(t)) {
    return { ok: false, reason: '⚠️ Input mencurigakan diblokir (XSS-Guard)' };
  }
  return { ok: true };
}

export function toast(msg, type = 'info') {
  const box = document.getElementById('alert-box');
  if (!box) return;
  const styles = {
    info: 'border-blue-500/30 text-blue-300 bg-slate-900/95',
    success: 'border-emerald-500/30 text-emerald-300 bg-slate-900/95',
    warning: 'border-amber-500/30 text-amber-300 bg-slate-900/95',
    error: 'border-red-500/30 text-red-300 bg-slate-900/95'
  };
  const el = document.createElement('div');
  el.className = `glass px-3.5 py-2.5 rounded-xl border text-xs font-medium shadow-lg ${styles[type] || styles.info}`;
  el.style.pointerEvents = 'auto';
  el.innerHTML = msg;
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = 'all .25s';
    setTimeout(() => el.remove(), 260);
  }, 3200);
}
