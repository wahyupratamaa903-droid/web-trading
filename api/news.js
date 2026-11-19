const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=XAUUSD+OR+Gold+Price+OR+Federal+Reserve+OR+DXY&hl=en-US&gl=US&ceid=US:en',
  'https://www.fxstreet.com/rss/news'
];

function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i)?.[1] ||
                   block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
    const source = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || 'Market Wire').replace(/<[^>]+>/g, '').trim();

    if (title) items.push({ title, link, pubDate, source });
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  for (const feedUrl of RSS_FEEDS) {
    try {
      const r = await fetch(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const xml = await r.text();
      const items = parseRSSItems(xml);
      if (items.length > 0) {
        return res.status(200).json({
          ok: true,
          source: feedUrl.includes('google') ? 'Google Finance News RSS' : 'FXStreet RSS',
          timestamp: Date.now(),
          items
        });
      }
    } catch (e) {}
  }

  return res.status(502).json({ ok: false, error: 'Gagal mengambil feed berita' });
}
