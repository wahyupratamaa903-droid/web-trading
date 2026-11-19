export function calcRisk() {
  const b = parseFloat(document.getElementById('rc-bal')?.value) || 0;
  const r = parseFloat(document.getElementById('rc-rsk')?.value) || 0;
  const sl = Math.max(parseFloat(document.getElementById('rc-sl')?.value) || 1, 0.1);
  const tp = Math.max(parseFloat(document.getElementById('rc-tp')?.value) || 1, 0.1);

  const amt = b * (r / 100);
  const pipVal = 10;
  const lot = sl > 0 ? (amt / (sl * pipVal)) : 0;
  const rr = tp / sl;
  const pft = lot * tp * pipVal;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('rc-amt', '$' + amt.toFixed(2));
  set('rc-lot', lot.toFixed(2));
  set('rc-rr', '1:' + rr.toFixed(2));
  set('rc-pft', '$' + pft.toFixed(2));
}

export function initRiskCalc() {
  ['rc-bal', 'rc-rsk', 'rc-sl', 'rc-tp'].forEach(id => document.getElementById(id)?.addEventListener('input', calcRisk));
  document.getElementById('calc-btn')?.addEventListener('click', calcRisk);
  calcRisk();
}
