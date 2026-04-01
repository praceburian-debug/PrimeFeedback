const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key) {
  const res  = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const json = await res.json();
  if (!json.result) return null;
  // Upstash vrací string — parsuj pokud je to JSON
  try { return JSON.parse(json.result); } catch { return json.result; }
}

async function redisSet(key, value) {
  // Upstash pipeline — ['SET', key, value] kde value musí být string
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([['SET', key, JSON.stringify(value)]]),
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
    const key  = `trello:card:${cardId}:annotations` + (attachmentId ? `:${attachmentId}` : '');
    const data = await redisGet(key);
    return res.status(200).json({ cardId, attachmentId, data: data ?? null });
  }

  if (req.method === 'POST') {
    const { cardId, attachmentId, data } = req.body ?? {};
    if (!cardId || !data) return res.status(400).json({ error: 'cardId and data required' });
    const key   = `trello:card:${cardId}:annotations` + (attachmentId ? `:${attachmentId}` : '');
    const saved = await redisSet(key, data);
    if (!saved) return res.status(500).json({ error: 'Redis write failed' });
    return res.status(200).json({ ok: true, cardId, attachmentId });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
