import legacy from './worker.js';
import gameHtml from './public/game.html';

const BUILD = 'H37';

function noStoreHeaders(contentType) {
  return {
    'content-type': contentType,
    'cache-control': 'no-store, max-age=0, must-revalidate',
    'pragma': 'no-cache',
    'expires': '0',
    'x-mtg-build': BUILD,
  };
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
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#181410;color:#fff;padding:24px"><h1>HTML delivery works</h1><p>Build H37</p></body>',
        { status: 200, headers: noStoreHeaders('text/html; charset=utf-8') }
      );
    }

    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/game' || url.pathname === '/game.html') {
      return new Response(gameHtml, {
        status: 200,
        headers: noStoreHeaders('text/html; charset=utf-8'),
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return legacy.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
