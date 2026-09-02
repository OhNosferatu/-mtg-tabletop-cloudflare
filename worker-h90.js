import h89 from './worker-h89.js';

const BUILD='H90';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes("#handcount'))handCount.textContent"))return source;
  return source.replace(
    'function render(){',
    `function render(){const handCount=$('#handcount');if(handCount)handCount.textContent=String(st.hand.length);`
  );
}

function transformHtml(source){
  let out=source.replaceAll('H89','H90').replaceAll('h89-','h90-');
  out=out.replace(
    '<aside id="hand" class="hand empty"><div class="handhead"><b>Your Hand <span class="hand-build">H34</span></b><button id="closehand" class="close">Close</button></div>',
    '<aside id="hand" class="hand empty"><div class="handhead"><span id="handcount" class="hand-count" aria-label="Cards in hand">0</span><button id="closehand" class="close">Close</button></div>'
  );
  out=out.replace(
    '.hand-build{font-size:8px;opacity:.6;margin-left:6px}',
    '.hand-build{display:none!important}.hand-count{display:inline-flex;align-items:center;gap:7px;min-width:42px;height:28px;padding:0 10px;border:1px solid #806a50;border-radius:9px;background:#211b17;color:#f5ead8;font:900 13px/1 ui-monospace,Menlo,monospace;box-shadow:0 2px 7px #0007}.hand-count:before{content:"";display:block;width:12px;height:17px;border:1.5px solid #d7b46a;border-radius:2px;box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 #8b7659}'
  );
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h89.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
