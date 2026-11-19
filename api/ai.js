export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const serverKey = process.env.OPENROUTER_API_KEY;
  const clientKey = req.headers['x-custom-key'];
  const apiKey = serverKey || clientKey;

  if (!apiKey) {
    return res.status(401).json({
      error: { message: 'OPENROUTER_API_KEY belum diset di Vercel Env atau tombol Kunci di header.' }
    });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin || 'https://web-trading-theta.vercel.app',
        'X-Title': 'GoldDXY-v10-Modular'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
