module.exports = async function handler(req, res) {
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

  const apiKey   = process.env.TRELLO_API_KEY;
  const apiToken = process.env.TRELLO_API_TOKEN;

  const sep      = url.includes('?') ? '&' : '?';
  const fetchUrl = apiKey && apiToken
    ? `${url}${sep}key=${apiKey}&token=${apiToken}`
    : url;
  console.log('apiKey:', apiKey ? 'OK' : 'MISSING');
  console.log('apiToken:', apiToken ? 'OK' : 'MISSING');
  console.log('fetchUrl starts:', fetchUrl.substring(0, 80));

  try {
    // Nejdřív získej redirect URL od Trella
    const trelloRes = await fetch(fetchUrl, { redirect: 'manual' });
    console.log('Trello status:', trelloRes.status);
    
    let finalUrl = fetchUrl;
    if (trelloRes.status === 302 || trelloRes.status === 301) {
      finalUrl = trelloRes.headers.get('location');
      console.log('Redirect to:', finalUrl?.substring(0, 80));
    }
    
    // Stáhni z finální URL (S3) bez autorizace
    const upstream = await fetch(finalUrl);
    console.log('Final status:', upstream.status);
    if (!upstream.ok) return res.status(upstream.status).end();
    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buffer      = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).end(buffer);
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).json({ error: e.message });
  }
};
