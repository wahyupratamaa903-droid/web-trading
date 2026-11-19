const SYMBOLS = {
  xau: 'GC=F',
  dxy: 'DX-Y.NYB',
  eur: 'EURUSD=X',
  btc: 'BTC-USD',
  vix: '^VIX',
  us10y: '^TNX',
  spx: '^GSPC'
};

async function fetchYahooChart(symbol, interval = '1d', range = '1mo') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol} HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const timestamps = result.timestamp || [];

  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = quote.close?.[i];
    if (c != null) {
      candles.push({
        t: timestamps[i],
        o: quote.open?.[i] ?? c,
        h: quote.high?.[i] ?? c,
        l: quote.low?.[i] ?? c,
        c: c,
        v: quote.volume?.[i] ?? 0
      });
    }
  }

  const price = meta.regularMarketPrice ?? (candles.length ? candles[candles.length - 1].c : null);
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? (candles.length > 1 ? candles[candles.length - 2].c : price);
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  return { symbol, price, prevClose, changePct, candles };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  try {
    const entries = Object.entries(SYMBOLS);
    const [dailyResults, xauH1] = await Promise.all([
      Promise.allSettled(entries.map(([key, sym]) => fetchYahooChart(sym, '1d', '1mo').then(d => [key, d]))),
      fetchYahooChart(SYMBOLS.xau, '60m', '14d').catch(() => null)
    ]);

    const assets = {};
    for (const r of dailyResults) {
      if (r.status === 'fulfilled') {
        const [key, data] = r.value;
        assets[key] = data;
      }
    }

    return res.status(200).json({
      ok: true,
      source: 'Yahoo Finance Server-Side Feed',
      timestamp: Date.now(),
      assets,
      xauH1: xauH1 ? xauH1.candles : []
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
