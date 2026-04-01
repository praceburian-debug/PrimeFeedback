const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const TRELLO_KEY  = process.env.TRELLO_API_KEY;

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

async function getBoardIdForCard(cardId, token) {
  const res = await fetch(
    `https://api.trello.com/1/cards/${cardId}?fields=idBoard&key=${TRELLO_KEY}&token=${token}`
  );
  if (!res.ok) return null;
  const card = await res.json();
  return card.idBoard ?? null;
}

async function verifyTrelloMember(token, boardId) {
  if (!token) return false;
  try {
    const res = await fetch(
      `https://api.trello.com/1/boards/${boardId}/memberships` +
      `?key=${TRELLO_KEY}&token=${token}&filter=active`
    );
    if (!res.ok) return false;
    const members = await res.json();
    return Array.isArray(members) && members.length > 0;
  } catch { return false; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  'https://trello.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-trello-token');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.headers['x-trello-token'] ?? null;

  if (req.method === 'GET') {
    const { cardId, attachmentId } = req.query;
    if (!cardId) return res.status(400).json({ error: 'cardId required' });
    const boardId = await getBoardIdForCard(cardId, token);
    if (!boardId) return res.status(403).json({ error: 'Cannot resolve board' });
    if (!await verifyTrelloMember(token, boardId))
      return res.status(403).json({ error: 'Not a board member' });
    const key = `trello:card:${cardId}:annotations` + (attachmentId ? `:${attachmentId}` : '');
    const raw = await redisGet(key);
    return res.status(200).json({ cardId, attachmentId, data: raw ? JSON.parse(raw) : null });
  }

  if (req.method === 'POST') {
    const { cardId, attachmentId, data } = req.body ?? {};
    if (!cardId || !data) return res.status(400).json({ error: 'cardId and data required' });
    const boardId = await getBoardIdForCard(cardId, token);
    if (!boardId) return res.status(403).json({ error: 'Cannot resolve board' });
    if (!await verifyTrelloMember(token, boardId))
      return res.status(403).json({ error: 'Not a board member' });
    const key = `trello:card:${cardId}:annotations` + (attachmentId ? `:${attachmentId}` : '');
    if (!await redisSet(key, JSON.stringify(data)))
      return res.status(500).json({ error: 'Redis write failed' });
    return res.status(200).json({ ok: true, cardId, attachmentId });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
