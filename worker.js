function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function idFromUrl(value) {
  const raw = String(value || '').trim();
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/decks\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
  } catch {}
  const match = raw.match(/(?:moxfield\.com\/decks\/)?([A-Za-z0-9_-]{8,})/);
  return match ? match[1] : null;
}

function boardItems(board) {
  if (!board) return [];
  const source = board.cards || board;
  const values = Array.isArray(source) ? source : Object.values(source || {});
  return values.map((entry) => {
    const card = entry.card || entry;
    const name = card.name || entry.name || card.oracleCard?.name;
    const quantity = Number(entry.quantity || card.quantity || 1);
    const scryfallId = card.scryfall_id || card.scryfallId || card.id;
    return name ? { name, quantity, scryfallId } : null;
  }).filter(Boolean);
}

function normalize(data) {
  const boards = data.boards || data;
  return {
    name: data.name || 'Imported Moxfield Deck',
    commander: boardItems(boards.commanders || data.commanders),
    deck: boardItems(boards.mainboard || data.mainboard),
    sideboard: boardItems(boards.sideboard || data.sideboard),
    tokens: boardItems(boards.tokens || data.tokens),
  };
}

function parseText(text) {
  const result = { name: 'Imported Moxfield Deck', commander: [], deck: [], sideboard: [], tokens: [] };
  let zone = 'deck';
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.toLowerCase().replace(/:$/, '');
    if (/^commander/.test(heading)) { zone = 'commander'; continue; }
    if (/^sideboard/.test(heading)) { zone = 'sideboard'; continue; }
    if (/^tokens?/.test(heading)) { zone = 'tokens'; continue; }
    const match = line.match(/^(\d+)\s*x?\s+(.+?)(?:\s+\([A-Za-z0-9]+\)\s+\S+)?$/i);
    if (match) result[zone].push({ name: match[2].trim(), quantity: Number(match[1]) || 1 });
  }
  return result;
}

async function fetchMoxfield(url, id) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      origin: 'https://www.moxfield.com',
      referer: `https://www.moxfield.com/decks/${id}`,
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'user-agent': 'Mozilla/5.0 (compatible; MTGTabletop/1.0)',
    },
  });
  return { response, body: await response.text() };
}

async function importMoxfield(request) {
  let input;
  try { input = await request.json(); }
  catch { return json({ error: 'Invalid request' }, 400); }

  const id = idFromUrl(input?.url);
  if (!id) return json({ error: 'Enter a valid Moxfield deck URL' }, 400);

  const attempts = [];
  const sources = [
    ['export', `https://api2.moxfield.com/v2/decks/all/${encodeURIComponent(id)}/export`],
    ['v3', `https://api2.moxfield.com/v3/decks/all/${encodeURIComponent(id)}`],
    ['v2', `https://api2.moxfield.com/v2/decks/all/${encodeURIComponent(id)}`],
    ['legacy', `https://api.moxfield.com/v2/decks/all/${encodeURIComponent(id)}`],
  ];

  for (const [source, url] of sources) {
    try {
      const { response, body } = await fetchMoxfield(url, id);
      attempts.push({ source, status: response.status });
      if (!response.ok) continue;
      if (source === 'export') {
        const deck = parseText(body);
        if (deck.deck.length || deck.commander.length) return json(deck);
      } else {
        const deck = normalize(JSON.parse(body));
        if (deck.deck.length || deck.commander.length) return json(deck);
      }
    } catch (error) {
      attempts.push({ source, error: error?.message || 'Unknown error' });
    }
  }

  return json({
    error: 'Moxfield blocked or rejected this deck request',
    detail: 'Make sure the deck is Public. If URL import is blocked by Moxfield, switch to Card List and paste the exported deck list.',
    attempts,
  }, 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/import-moxfield') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'Content-Type' } });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      return importMoxfield(request);
    }
    return env.ASSETS.fetch(request);
  },
};
