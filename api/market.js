const MACRO_SYMBOLS = {
  dxy: 'DX-Y.NYB',
  vix: '^VIX',
  us10y: '^TNX',
  spx: '^GSPC',
  xau: 'GC=F',
  eur: 'EURUSD=X',
  btc: 'BTC-USD'
};

const PAIR_MAP = {
  'XAU/USD': { yahoo: 'GC=F' },
  'XAG/USD': { yahoo: 'SI=F' },
  'EUR/USD': { yahoo: 'EURUSD=X' },
  'GBP/USD': { yahoo: 'GBPUSD=X' },
  'USD/JPY': { yahoo: 'USDJPY=X' },
  'GBP/JPY': { yahoo: 'GBPJPY=X' },
  'AUD/USD': { yahoo: 'AUDUSD=X' },
  'USD/CAD': { yahoo: 'USDCAD=X' },
  'USD/CHF': { yahoo: 'USDCHF=X' },
  'NZD/USD': { yahoo: 'NZDUSD=X' },
  'DXY':     { yahoo: 'DX-Y.NYB' },
  'BTC/USD': { yahoo: 'BTC-USD' },
  'ETH/USD': { yahoo: 'ETH-USD' },
  'SOL/USD': { yahoo: 'SOL-USD' },
  'US500':   { yahoo: '^GSPC' },
  'US100':   { yahoo: '^NDX' },
  'WTI/USD': { yahoo: 'CL=F' }
};

function resolveYahooSymbol(pairOrSym) {
  const clean = (pairOrSym || 'XAU/USD').trim().toUpperCase();
  if (PAIR_MAP[clean]) return PAIR_MAP[clean].yahoo;
  const noSlash = clean.replace('/', '');
  if (/^[A-Z]{6}$/.test(noSlash) && !noSlash.startsWith('BTC') && !noSlash.startsWith('ETH') && !noSlash.startsWith('SOL')) {
    return noSlash + '=X';
  }
  return clean;
}

async function fetchYahooChart(symbol, interval = '1d', range = '1mo') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol} HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Simbol ${symbol} tidak ditemukan`);

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
  const prevClose = candles.length >= 2
    ? candles[candles.length - 2].c
    : (meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? price);
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

  return {
    symbol,
    exchange: meta.exchangeName || 'Yahoo Finance',
    currency: meta.currency || 'USD',
    price,
    prevClose,
    changePct,
    dayHigh: meta.regularMarketDayHigh ?? (candles.length ? candles[candles.length - 1].h : price),
    dayLow: meta.regularMarketDayLow ?? (candles.length ? candles[candles.length - 1].l : price),
    candles
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  try {
    const activePair = (req.query.pair || 'XAU/USD').toString();
    const tf = (req.query.tf || '60m').toString();
    const extraList = (req.query.watchlist || 'XAU/USD,DXY,EUR/USD,BTC/USD,GBP/USD,USD/JPY')
      .toString()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    const rangeMap = { '15m': '5d', '60m': '1mo', '1d': '6mo' };
    const candleRange = rangeMap[tf] || '1mo';
    const activeYahoo = resolveYahooSymbol(activePair);

    const macroEntries = Object.entries(MACRO_SYMBOLS);
    const [macroSettled, activeCandles, watchlistSettled] = await Promise.all([
      Promise.allSettled(macroEntries.map(([k, sym]) => fetchYahooChart(sym, '1d', '1mo').then(d => [k, d]))),
      fetchYahooChart(activeYahoo, tf, candleRange).catch(() => null),
      Promise.allSettled(extraList.map(async p => {
        const ySym = resolveYahooSymbol(p);
        const data = await fetchYahooChart(ySym, '1d', '5d');
        return [p, data];
      }))
    ]);

    const macro = {};
    for (const r of macroSettled) {
      if (r.status === 'fulfilled') macro[r.value[0]] = r.value[1];
    }

    const watchlist = {};
    for (const r of watchlistSettled) {
      if (r.status === 'fulfilled') watchlist[r.value[0]] = r.value[1];
    }

    return res.status(200).json({
      ok: true,
      source: 'Yahoo Finance Institutional API',
      sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(activeYahoo)}`,
      timestamp: Date.now(),
      activePair,
      activeYahoo,
      timeframe: tf,
      activeData: activeCandles,
      macro,
      watchlist
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
