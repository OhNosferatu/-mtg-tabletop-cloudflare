import h127 from './worker-h127.js';

const BUILD='H128';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source;
  if(out.includes('h128-live-build-label'))return out;

  /* Keep the visible hand build label tied to the worker health endpoint rather
     than relying on every wrapper to rewrite the previous hard-coded label. */
  out=out.replace(/(<span class="hand-build">)[^<]*(<\/span>)/,'$1'+BUILD+'$2');

  const script=`<script id="h128-live-build-label">(()=>{
    const apply=build=>{
      if(!build)return;
      document.querySelectorAll('.hand-build').forEach(el=>{el.textContent=String(build)});
      document.documentElement.dataset.mtgBuild=String(build);
      window.MTG_BUILD=String(build);
    };
    apply('${BUILD}');
    fetch('/api/health',{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(data=>apply(data?.build))
      .catch(()=>{});
  })();</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h127.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
