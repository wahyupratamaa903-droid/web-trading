const QUERY_MAP = {
  ALL: 'Forex+OR+XAUUSD+OR+Federal+Reserve+OR+ECB+OR+Inflation+CPI',
  XAU: 'XAUUSD+OR+Gold+Price+OR+Bullion+OR+Federal+Reserve',
  USD: 'US+Dollar+DXY+OR+Federal+Reserve+OR+FOMC+OR+NFP+CPI',
  EUR: 'EURUSD+OR+Eurozone+OR+ECB+Christine+Lagarde+inflation',
  GBP: 'GBPUSD+OR+Bank+of+England+OR+UK+Inflation+GDP',
  JPY: 'USDJPY+OR+Bank+of+Japan+OR+Yen+intervention',
  AUD: 'AUDUSD+OR+Reserve+Bank+of+Australia+RBA',
  CAD: 'USDCAD+OR+Bank+of+Canada+OR+Crude+Oil+WTI',
  BTC: 'Bitcoin+BTC+OR+Crypto+Market+ETF+SEC'
};

function classifyImpact(title) {
  const t = title.toLowerCase();
  const redWords = ['fomc', 'fed ', 'interest rate', 'rate cut', 'rate hike', 'cpi', 'inflation', 'non-farm', 'nfp', 'payroll', 'powell', 'lagarde', 'ecb', 'boj', 'boe', 'gdp', 'emergency', 'crash', 'surge', 'plunge', 'war', 'tariff'];
  const orangeWords = ['pmi', 'retail sales', 'unemployment', 'jobless', 'yield', 'treasury', 'central bank', 'forecast', 'outlook', 'breakout', 'rally', 'sell-off', 'gold', 'dollar'];
  const yellowWords = ['analysis', 'technical', 'support', 'resistance', 'weekly', 'session', 'asian', 'european', 'market wrap'];

  if (redWords.some(w => t.includes(w))) return { level: 'red', label: 'MERAH • HIGH IMPACT' };
  if (orangeWords.some(w => t.includes(w))) return { level: 'orange', label: 'ORANYE • MEDIUM-HIGH' };
  if (yellowWords.some(w => t.includes(w))) return { level: 'yellow', label: 'KUNING • MEDIUM' };
  return { level: 'gray', label: 'ABU-ABU • LOW / WIRE' };
}

function classifySentiment(title, filterKey) {
  const t = title.toLowerCase();
  const upWords = ['rises', 'gains', 'surges', 'jumps', 'rallies', 'climbs', 'bullish', 'higher', 'soars', 'boosts'];
  const downWords = ['falls', 'drops', 'slides', 'declines', 'sinks', 'bearish', 'lower', 'plunges', 'pressured', 'weakens'];
  if (upWords.some(w => t.includes(w))) return { dir: 'bull', text: `Positif / Bullish (${filterKey})` };
  if (downWords.some(w => t.includes(w))) return { dir: 'bear', text: `Negatif / Bearish (${filterKey})` };
  return { dir: 'neutral', text: 'Netral / Menunggu Katalis' };
}

function parseRSSItems(xml, filterKey) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 18) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)?.[1] ||
                   block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
    const sourceTag = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim();

    if (title) {
      const impact = classifyImpact(title);
      const sentiment = classifySentiment(title, filterKey);
      items.push({
        title,
        link,
        pubDate,
        source: sourceTag || 'Reuters / Financial Wire',
        impactLevel: impact.level,
        impactLabel: impact.label,
        sentimentDir: sentiment.dir,
        sentimentText: sentiment.text
      });
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=180');

  const rawTopic = (req.query.topic || 'ALL').toString().toUpperCase().trim();
  const baseKey = rawTopic.split('/')[0];
  const queryTerm = QUERY_MAP[rawTopic] || QUERY_MAP[baseKey] || encodeURIComponent(rawTopic + ' forex market');

  const feeds = [
    `https://news.google.com/rss/search?q=${queryTerm}&hl=en-US&gl=US&ceid=US:en`,
    'https://www.fxstreet.com/rss/news'
  ];

  for (const feedUrl of feeds) {
    try {
      const r = await fetch(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const xml = await r.text();
      const items = parseRSSItems(xml, rawTopic);
      if (items.length > 0) {
        return res.status(200).json({
          ok: true,
          topic: rawTopic,
          aggregator: feedUrl.includes('google') ? 'Google Finance News Aggregator (Reuters, Bloomberg, FXStreet, CNBC)' : 'FXStreet Official Wire',
          timestamp: Date.now(),
          items
        });
      }
    } catch (e) {}
  }

  return res.status(502).json({ ok: false, error: 'Gagal mengambil berita untuk topik ' + rawTopic });
}
