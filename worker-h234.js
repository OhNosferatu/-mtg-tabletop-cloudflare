import h233 from './worker-h233.js';

const BUILD='H234';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h234-opponent-doubletap-delay'))return out;

  /* Wait longer before treating the first dedicated-Opponent tap as a single
     tap. This gives iPhone Safari 450ms to deliver the second press. The H124
     recognizer used by Your Side and Full Board keeps its existing timing. */
  const h232Start=out.indexOf('<script id="h232-opponent-h124-parity">');
  const h232End=h232Start>=0?out.indexOf('</script>',h232Start):-1;
  if(h232Start>=0&&h232End>h232Start){
    const block=out.slice(h232Start,h232End);
    const timed=block.replace('const DOUBLE_MS=285;','const DOUBLE_MS=450;');
    out=out.slice(0,h232Start)+timed+out.slice(h232End);
  }

  /* H209 has an older single-tap viewer fallback. Keep it behind the expanded
     Opponent double-tap window so it cannot open the viewer between presses. */
  out=out.replace(
`      },DOUBLE_MS+55);
      pending.set(key,timer);`,
`      },ownerFor(cur.card)==='opp'&&document.body.classList.contains('h157-opp-mode')?525:DOUBLE_MS+55);
      pending.set(key,timer);`
  );

  out=out.replace('</body>','\n<!-- h234-opponent-doubletap-delay -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h233.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await h233.fetch(request,env,ctx);

      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
