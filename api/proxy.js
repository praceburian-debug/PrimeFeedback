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
    // Použij Trello API místo přímého download linku
    // Extrahuj cardId a attachmentId z URL
    const match = url.match(/cards\/([^/]+)\/attachments\/([^/]+)\/download/);
    
    let finalUrl = fetchUrl;
    if (match) {
      const [, cardId, attId] = match;
      // Nejdřív získej attachment info přes API
      const infoRes = await fetch(
        `https://api.trello.com/1/cards/${cardId}/attachments/${attId}?key=${apiKey}&token=${apiToken}`
      );
      console.log('Info status:', infoRes.status);
      if (infoRes.ok) {
        const info = await infoRes.json();
        console.log('Attachment url:', info.url?.substring(0, 80));
        // Použij url z API response — může být signed S3 URL
        if (info.url) finalUrl = info.url;
      }
    }

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
