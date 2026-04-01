/**
 * /api/proxy?url=...
 * Stáhne obrázek na serveru s Trello tokenem — obchází CORS blokaci.
 * Token předáváme v hlavičce x-trello-token z viewer.html
 */
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'url required' });

  let parsed;
  try { parsed = new URL(url); } catch {
    return res.status(400).json({ error: 'invalid url' });
  }
  const allowed = ['trello.com', 'trellocdn.com', 'amazonaws.com'];
  if (!allowed.some(d => parsed.hostname.endsWith(d))) {
    return res.status(403).json({ error: 'domain not allowed' });
  }

  const token  = req.headers['x-trello-token'];
  const apiKey = process.env.TRELLO_API_KEY;

  let fetchUrl = url;
  if (token && apiKey) {
    const sep = url.includes('?') ? '&' : '?';
    fetchUrl = `${url}${sep}key=${apiKey}&token=${token}`;
  }

  try {
    const upstream = await fetch(fetchUrl);
    if (!upstream.ok) return res.status(upstream.status).end();

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buffer = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
