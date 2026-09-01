function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function archidektId(value) {
  const raw = String(value || '').trim();
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/decks\/(\d+)/);
    if (match) return match[1];
  } catch {}
  const match = raw.match(/(?:archidekt\.com\/decks\/)?(\d+)/i);
  return match ? match[1] : null;
}

function categoryNames(entry, categoryById) {
  return (entry.categories || []).map((category) => {
    if (typeof category === 'string') return category;
    if (typeof category === 'number') return categoryById.get(String(category))?.name || '';
    if (category && typeof category === 'object') return category.name || categoryById.get(String(category.id))?.name || '';
    return '';
  }).filter(Boolean);
}

function selectedPrintingKey(card) {
  const edition = card.edition || {};
  const setCode = String(
    edition.editioncode || edition.editionCode || edition.code || edition.setCode ||
    card.setCode || card.set || ''
  ).trim().toLowerCase();
  const collector = String(card.collectorNumber || card.collector_number || '').trim();
  if (setCode && collector) return `set:${setCode}:${collector}`;
  const uid = String(card.uid || card.scryfallId || card.scryfall_id || '').trim();
  return uid || null;
}

function normalizeArchidekt(data) {
  const result = {
    name: data.name || 'Imported Archidekt Deck',
    commander: [],
    deck: [],
    sideboard: [],
    tokens: [],
  };

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const categoryById = new Map(categories.map((category) => [String(category.id), category]));

  for (const entry of (data.cards || [])) {
    const card = entry.card || {};
    const oracle = card.oracleCard || {};
    const name = oracle.name || card.name || entry.name;
    if (!name) continue;

    const quantity = Math.max(1, Number(entry.quantity || 1));
    const names = categoryNames(entry, categoryById).map((x) => x.toLowerCase());
    const scryfallId = selectedPrintingKey(card);
    const item = { name, quantity, ...(scryfallId ? { scryfallId } : {}) };

    const isCommander = names.some((x) => x === 'commander' || x === 'commanders' || x.includes('command zone'));
    const isToken = names.some((x) => x === 'token' || x === 'tokens');
    const isSideboard = names.some((x) => x === 'sideboard' || x === 'side board' || x === 'maybeboard' || x === 'maybe board');
    const excludedCategory = categories.some((category) => category.includedInDeck === false && names.includes(String(category.name || '').toLowerCase()));

    if (isCommander) result.commander.push({ ...item, commander: true });
    else if (isToken) result.tokens.push({ ...item, token: true });
    else if (isSideboard || excludedCategory) result.sideboard.push(item);
    else result.deck.push(item);
  }

  return result;
}

async function fetchArchidektDeck(id) {
  return fetch(`https://archidekt.com/api/decks/${encodeURIComponent(id)}/`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'MTGTabletop/1.0',
    },
  });
}

async function importArchidekt(request) {
  let input;
  try { input = await request.json(); }
  catch { return json({ error: 'Invalid request' }, 400); }

  const id = archidektId(input?.url);
  if (!id) return json({ error: 'Enter a valid Archidekt deck URL' }, 400);

  try {
    const response = await fetchArchidektDeck(id);
    if (!response.ok) {
      return json({ error: `Archidekt returned ${response.status}`, detail: 'Make sure the deck exists and is public.' }, response.status === 404 ? 404 : 502);
    }

    const deck = normalizeArchidekt(await response.json());
    if (!deck.deck.length && !deck.commander.length && !deck.sideboard.length) {
      return json({ error: 'No cards were found in that Archidekt deck.' }, 422);
    }
    return json(deck);
  } catch (error) {
    return json({ error: 'Archidekt import failed', detail: error?.message || 'Unknown network error' }, 502);
  }
}

async function fetchScryfall(path) {
  return fetch(`https://api.scryfall.com${path}`, {
    headers: {
      accept: 'application/json;q=0.9,*/*;q=0.8',
      'user-agent': 'MTGTabletop/1.0 (Cloudflare Worker)',
    },
  });
}

async function cardLookup(url) {
  const name = String(url.searchParams.get('name') || '').trim();
  const id = String(url.searchParams.get('id') || '').trim();
  if (!name && !id) return json({ error: 'Missing card name or printing id' }, 400);

  try {
    let response = null;
    let usedExactPrinting = false;

    if (id.startsWith('set:')) {
      const [, setCode, ...collectorParts] = id.split(':');
      const collector = collectorParts.join(':');
      if (setCode && collector) {
        response = await fetchScryfall(`/cards/${encodeURIComponent(setCode)}/${encodeURIComponent(collector)}`);
        usedExactPrinting = response.ok;
      }
    } else if (id) {
      response = await fetchScryfall(`/cards/${encodeURIComponent(id)}`);
      usedExactPrinting = response.ok;
    }

    if (!response || !response.ok) {
      if (!name) return json({ error: `Scryfall could not find printing ${id}` }, 404);
      response = await fetchScryfall(`/cards/named?exact=${encodeURIComponent(name)}`);
      usedExactPrinting = false;
    }

    if (!response.ok) {
      return json({ error: `Scryfall returned ${response.status}` }, response.status === 404 ? 404 : 502);
    }

    const card = await response.json();
    const faceImages = (card.card_faces || [])
      .map((face) => ({
        name: face.name || card.name || '',
        image: face.image_uris?.normal || '',
      }))
      .filter((face) => face.image);

    const frontImage = card.image_uris?.normal || faceImages[0]?.image || '';
    if (!frontImage) return json({ error: 'No image available for this card' }, 404);

    const doubleFacedLayouts = new Set(['transform', 'modal_dfc', 'double_faced_token', 'reversible_card']);
    const isDoubleFaced = doubleFacedLayouts.has(card.layout) && faceImages.length > 1;

    return new Response(JSON.stringify({
      image: frontImage,
      faces: faceImages.length ? faceImages : [{ name: card.name || name, image: frontImage }],
      isDoubleFaced,
      layout: card.layout || null,
      exactPrinting: usedExactPrinting,
      scryfallId: card.id || null,
      set: card.set || null,
      collectorNumber: card.collector_number || null,
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return json({ error: 'Card lookup failed', detail: error?.message || 'Unknown network error' }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/card') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      return cardLookup(url);
    }

    if (url.pathname === '/api/import-archidekt' || url.pathname === '/api/import-moxfield') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-methods': 'POST,OPTIONS',
            'access-control-allow-headers': 'Content-Type',
          },
        });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      return importArchidekt(request);
    }

    return env.ASSETS.fetch(request);
  },
};
