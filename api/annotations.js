const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const json = await res.json();
  return json.result ?? null;
}

async function redisSet(key, value) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(value),
  });
  return res.ok;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-trello-token');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const { cardId, attachmentId } = req.query;
    if (!cardId) return res.status(400).json({ error: 'cardId required' });
    const key = `trello:card:${cardId}:annotations` + (attachmentId ? `:${attachmentId}` : '');
    const raw = await redisGet(key);
    return res.status(200).json({ cardId, attachmentId, data: raw ? JSON.parse(raw) : null });
  }

  if (req.method === 'POST') {
    const { cardId, attachmentId, data } = req.body ?? {};
    if (!cardId || !data) return res.status(400).json({ error: 'cardId and data required' });
    const key = `trello:card:${cardId}:annotations` + (attachmentId ? `:${attachmentId}` : '');
    if (!await redisSet(key, JSON.stringify(data))) return res.status(500).json({ error: 'Redis write failed' });
    return res.status(200).json({ ok: true, cardId, attachmentId });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
