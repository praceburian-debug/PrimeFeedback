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

  const apiKey = process.env.TRELLO_API_KEY;
  const apiToken = process.env.TRELLO_API_TOKEN;  // přidáme novou env proměnnou

  let fetchUrl = url;
  if (apiKey && apiToken) {
    const sep = url.includes('?') ? '&' : '?';
    fetchUrl = `${url}${sep}key=${apiKey}&token=${apiToken}`;
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
```

Teď potřebuješ přidat **server-side token** do Vercel env proměnných. Jdi na:

**Vercel Dashboard → tvůj projekt → Settings → Environment Variables**

Přidej:
```
TRELLO_API_TOKEN = <tvůj osobní token>
