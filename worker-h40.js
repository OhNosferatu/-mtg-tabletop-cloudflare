import legacy from './worker.js';
import gameHtml from './public/game.html';

const BUILD = 'H40';

function noStoreHeaders(contentType) {
  return {
    'content-type': contentType,
    'cache-control': 'no-store, max-age=0, must-revalidate',
    'pragma': 'no-cache',
    'expires': '0',
    'x-mtg-build': BUILD,
  };
}

function preparedGameHtml() {
  let html = String(gameHtml)
    .replace(/<link\s+rel=["']stylesheet["'][^>]*>/gi, '')
    .replace(/<script\s+src=["'][^"']+["'][^>]*><\/script>/gi, '');

  const critical = `
<style id="h40-critical">
html,body{margin:0;min-height:100%;background:#171310;color:#f4eadb;font-family:system-ui,-apple-system,sans-serif}
#h40boot{position:fixed;left:10px;right:10px;top:max(10px,env(safe-area-inset-top));z-index:999999;background:#211b17f5;color:#fff;border:1px solid #8b7659;border-radius:10px;padding:10px 12px;font:12px/1.35 ui-monospace,Menlo,monospace;box-shadow:0 8px 24px #0008;pointer-events:none}
#h40boot strong{color:#e6c27d}#h40boot .ok{color:#8fd19e}#h40boot .bad{color:#ff9c8f}
</style>`;

  const loader = `
<div id="h40boot"><strong>MTG TableTop H40</strong><div id="h40line">Preparing game…</div></div>
<script>
(()=>{
  const box=document.getElementById('h40boot'), line=document.getElementById('h40line');
  const css=['/style.css','/controls.css','/hand-select.css','/counter-ui.css','/board-ui.css'];
  const js=['/app.js','/counter-ui.js','/hand-close.js','/deck-state.js','/ios-guard.js'];
  const stamp='h40-'+Date.now();
  const report=(text,cls='')=>{line.className=cls;line.textContent=text;};
  const loadCss=(src)=>new Promise(resolve=>{
    report('Loading '+src+' …');
    const el=document.createElement('link'); el.rel='stylesheet'; el.href=src+'?'+stamp;
    let done=false;
    const finish=(state)=>{if(done)return;done=true;clearTimeout(timer);resolve({src,state});};
    el.onload=()=>finish('ok'); el.onerror=()=>finish('error');
    const timer=setTimeout(()=>finish('timeout'),4500);
    document.head.appendChild(el);
  });
  const loadJs=(src)=>new Promise(resolve=>{
    report('Loading '+src+' …');
    const el=document.createElement('script'); el.src=src+'?'+stamp; el.async=false;
    let done=false;
    const finish=(state)=>{if(done)return;done=true;clearTimeout(timer);if(state==='timeout')el.remove();resolve({src,state});};
    el.onload=()=>finish('ok'); el.onerror=()=>finish('error');
    const timer=setTimeout(()=>finish('timeout'),6000);
    document.body.appendChild(el);
  });
  (async()=>{
    const failures=[];
    for(const src of css){const r=await loadCss(src);if(r.state!=='ok')failures.push(r);}
    for(const src of js){const r=await loadJs(src);if(r.state!=='ok')failures.push(r);}
    if(failures.length){
      report('Loaded with issue: '+failures.map(x=>x.src+' '+x.state).join(' | '),'bad');
      box.style.pointerEvents='auto';
      return;
    }
    report('Game loaded · H40','ok');
    setTimeout(()=>box.remove(),1200);
  })().catch(err=>{report('Boot error: '+(err&&err.message?err.message:String(err)),'bad');box.style.pointerEvents='auto';});
})();
</script>`;

  html = html.replace('</head>', critical + '</head>');
  html = html.replace('</body>', loader + '</body>');
  return html;
}

const GAME_HTML = preparedGameHtml();

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
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#181410;color:#fff;padding:24px"><h1>HTML delivery works</h1><p>Build H40</p></body>',
        { status: 200, headers: noStoreHeaders('text/html; charset=utf-8') }
      );
    }

    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/game' || url.pathname === '/game.html') {
      return new Response(GAME_HTML, {
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
