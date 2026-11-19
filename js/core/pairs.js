export const PRESET_PAIRS = [
  { pair: 'XAU/USD', name: 'Gold Spot / US Dollar', tv: 'OANDA:XAUUSD', yahoo: 'GC=F', decimals: 2, pipSize: 0.1, pipVal: 10 },
  { pair: 'XAG/USD', name: 'Silver / US Dollar', tv: 'OANDA:XAGUSD', yahoo: 'SI=F', decimals: 3, pipSize: 0.01, pipVal: 50 },
  { pair: 'EUR/USD', name: 'Euro / US Dollar', tv: 'FX:EURUSD', yahoo: 'EURUSD=X', decimals: 4, pipSize: 0.0001, pipVal: 10 },
  { pair: 'GBP/USD', name: 'British Pound / US Dollar', tv: 'FX:GBPUSD', yahoo: 'GBPUSD=X', decimals: 4, pipSize: 0.0001, pipVal: 10 },
  { pair: 'USD/JPY', name: 'US Dollar / Japanese Yen', tv: 'FX:USDJPY', yahoo: 'USDJPY=X', decimals: 2, pipSize: 0.01, pipVal: 6.8 },
  { pair: 'GBP/JPY', name: 'British Pound / Japanese Yen', tv: 'FX:GBPJPY', yahoo: 'GBPJPY=X', decimals: 2, pipSize: 0.01, pipVal: 6.8 },
  { pair: 'AUD/USD', name: 'Australian Dollar / US Dollar', tv: 'FX:AUDUSD', yahoo: 'AUDUSD=X', decimals: 4, pipSize: 0.0001, pipVal: 10 },
  { pair: 'USD/CAD', name: 'US Dollar / Canadian Dollar', tv: 'FX:USDCAD', yahoo: 'USDCAD=X', decimals: 4, pipSize: 0.0001, pipVal: 7.3 },
  { pair: 'USD/CHF', name: 'US Dollar / Swiss Franc', tv: 'FX:USDCHF', yahoo: 'USDCHF=X', decimals: 4, pipSize: 0.0001, pipVal: 11.2 },
  { pair: 'NZD/USD', name: 'New Zealand Dollar / USD', tv: 'FX:NZDUSD', yahoo: 'NZDUSD=X', decimals: 4, pipSize: 0.0001, pipVal: 10 },
  { pair: 'DXY',     name: 'US Dollar Index', tv: 'TVC:DXY', yahoo: 'DX-Y.NYB', decimals: 2, pipSize: 0.01, pipVal: 10 },
  { pair: 'BTC/USD', name: 'Bitcoin / US Dollar', tv: 'BINANCE:BTCUSDT', yahoo: 'BTC-USD', decimals: 0, pipSize: 1, pipVal: 1 },
  { pair: 'ETH/USD', name: 'Ethereum / US Dollar', tv: 'BINANCE:ETHUSDT', yahoo: 'ETH-USD', decimals: 2, pipSize: 0.1, pipVal: 1 },
  { pair: 'SOL/USD', name: 'Solana / US Dollar', tv: 'BINANCE:SOLUSDT', yahoo: 'SOL-USD', decimals: 2, pipSize: 0.01, pipVal: 1 },
  { pair: 'US500',   name: 'S&P 500 Index', tv: 'FOREXCOM:SPXUSD', yahoo: '^GSPC', decimals: 1, pipSize: 0.1, pipVal: 10 },
  { pair: 'US100',   name: 'Nasdaq 100 Index', tv: 'NASDAQ:NDX', yahoo: '^NDX', decimals: 1, pipSize: 0.1, pipVal: 10 },
  { pair: 'WTI/USD', name: 'WTI Crude Oil', tv: 'TVC:USOIL', yahoo: 'CL=F', decimals: 2, pipSize: 0.01, pipVal: 10 }
];

export function getPairMeta(pairInput) {
  const clean = (pairInput || 'XAU/USD').trim().toUpperCase();
  const found = PRESET_PAIRS.find(p => p.pair === clean || p.pair.replace('/', '') === clean.replace('/', ''));
  if (found) return found;

  const noSlash = clean.replace('/', '');
  const isJpy = noSlash.endsWith('JPY');
  const isForex6 = /^[A-Z]{6}$/.test(noSlash) && !noSlash.startsWith('BTC') && !noSlash.startsWith('ETH') && !noSlash.startsWith('SOL');
  return {
    pair: clean,
    name: `Custom Market (${clean})`,
    tv: isForex6 ? `FX:${noSlash}` : noSlash,
    yahoo: isForex6 ? `${noSlash}=X` : clean,
    decimals: isJpy ? 2 : isForex6 ? 4 : 2,
    pipSize: isJpy ? 0.01 : isForex6 ? 0.0001 : 0.01,
    pipVal: isJpy ? 6.8 : 10
  };
}

export function formatPairPrice(pair, price) {
  if (price == null || isNaN(price)) return '--';
  const meta = getPairMeta(pair);
  if (meta.decimals === 0) return '$' + Math.round(price).toLocaleString('en-US');
  const prefix = (pair.includes('XAU') || pair.includes('XAG') || pair.includes('BTC') || pair.includes('ETH') || pair.includes('WTI')) ? '$' : '';
  return prefix + Number(price).toFixed(meta.decimals);
}
