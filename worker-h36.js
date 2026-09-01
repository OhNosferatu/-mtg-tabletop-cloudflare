import legacy from './worker.js';

const BUILD = 'H36';

function noStoreHeaders(contentType) {
  return {
    'content-type': contentType,
    'cache-control': 'no-store, max-age=0, must-revalidate',
    'pragma': 'no-cache',
    'expires': '0',
    'x-mtg-build': BUILD,
  };
}

async function serveGameHtml(request, env) {
  const assetUrl = new URL(request.url);
  // Use the non-index HTML asset so Cloudflare's special index handling is bypassed.
  assetUrl.pathname = '/game';
  assetUrl.search = '';

  const assetRequest = new Request(assetUrl.toString(), {
    method: 'GET',
    headers: request.headers,
  });
  const asset = await env.ASSETS.fetch(assetRequest);
  const html = await asset.text();

  if (!asset.ok || !html.trim()) {
    return new Response(
      `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#181410;color:white;padding:24px"><h1>MTG TableTop H36</h1><p>The HTML asset could not be read.</p><p>Status: ${asset.status}</p><p>Bytes: ${html.length}</p></body>`,
      { status: 500, headers: noStoreHeaders('text/html; charset=utf-8') }
    );
  }

  return new Response(html, {
    status: 200,
    headers: noStoreHeaders('text/html; charset=utf-8'),
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ ok: true, build: BUILD }), {
        status: 200,
        headers: noStoreHeaders('application/json; charset=utf-8'),
      });
    }

    if (url.pathname === '/api/html-test') {
      return new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#181410;color:#fff;padding:24px"><h1>HTML delivery works</h1><p>Build H36</p></body>',
        { status: 200, headers: noStoreHeaders('text/html; charset=utf-8') }
      );
    }

    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/game' || url.pathname === '/game.html') {
      return serveGameHtml(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return legacy.fetch(request, env, ctx);
    }

    // Do not re-wrap CSS/JS/image responses. Return the asset response unchanged.
    return env.ASSETS.fetch(request);
  },
};
