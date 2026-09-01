import h82 from './worker-h82.js';

const BUILD='H83';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('boardzoomtapindicator'))return source;
  let out=source;

  out=out.replace(
    '#boardzoomcardwrap{position:relative;display:flex;align-items:center;justify-content:center;width:max-content;max-width:min(76vw,360px);max-height:calc(100dvh - 310px)}',
    '#boardzoomcardwrap{position:relative;display:flex;align-items:center;justify-content:center;width:max-content;max-width:min(76vw,360px);max-height:calc(100dvh - 310px)}#boardzoomtapindicator{position:absolute;right:-46px;top:50%;transform:translateY(-50%);z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:42px;pointer-events:none;color:#f0dcb7;text-shadow:0 2px 4px #000}#boardzoomtapindicator[hidden]{display:none!important}#boardzoomtapindicator .tapturn-arrow{font:900 28px/1 system-ui;transform:rotate(-10deg)}#boardzoomtapindicator .tapturn-card{display:block;width:28px;height:19px;border:2px solid #eedca8;border-radius:3px;background:rgba(43,35,28,.92);box-shadow:0 2px 8px #0009}#boardzoomtapindicator .tapturn-label{font:900 6px/1 ui-monospace,Menlo,monospace;letter-spacing:.4px}'
  );

  out=out.replace(
    '<div id="boardzoomcardwrap"><img alt="Card preview" decoding="async"><div id="boardzoomcardstats" hidden></div></div>',
    '<div id="boardzoomcardwrap"><img alt="Card preview" decoding="async"><div id="boardzoomcardstats" hidden></div><div id="boardzoomtapindicator" hidden aria-label="Tapped clockwise"><span class="tapturn-arrow">↷</span><span class="tapturn-card"></span><span class="tapturn-label">TAPPED</span></div></div>'
  );

  out=out.replace(
    "const tap=z.querySelector('[data-zact=\"tap\"]');if(tap)tap.textContent=c.tap?'Untap':'Tap';",
    "const tap=z.querySelector('[data-zact=\"tap\"]');if(tap)tap.textContent=c.tap?'Untap':'Tap';const tapIndicator=z.querySelector('#boardzoomtapindicator');if(tapIndicator)tapIndicator.hidden=!c.tap;"
  );

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h82.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H82','H83').replaceAll('h82-','h83-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
