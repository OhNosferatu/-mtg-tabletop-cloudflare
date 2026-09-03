import h164 from './worker-h164.js';

const BUILD='H165';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h165-mana-symbol-art'))return out;

  const css=`<style id="h165-mana-symbol-art">
/* H165: ~30% smaller battlefield mana tokens + real MTG mana-symbol artwork. */
.h164-mana-token{
  width:32px!important;
  height:32px!important;
  font-size:12px!important;
  background-color:transparent!important;
  background-position:center!important;
  background-repeat:no-repeat!important;
  background-size:cover!important;
  border:1.5px solid rgba(245,238,220,.66)!important;
  box-shadow:0 3px 7px #0008!important;
}
.h164-mana-token.h164-moving{
  border-color:#f0c84b!important;
  box-shadow:0 0 0 3px rgba(240,200,75,.95),0 7px 14px #0009!important;
}
.h164-mana-preview{
  background-color:transparent!important;
  background-position:center!important;
  background-repeat:no-repeat!important;
  background-size:cover!important;
  color:transparent!important;
}
.h164-mana-w{background-image:url('https://svgs.scryfall.io/card-symbols/W.svg')!important}
.h164-mana-u{background-image:url('https://svgs.scryfall.io/card-symbols/U.svg')!important}
.h164-mana-b{background-image:url('https://svgs.scryfall.io/card-symbols/B.svg')!important}
.h164-mana-r{background-image:url('https://svgs.scryfall.io/card-symbols/R.svg')!important}
.h164-mana-g{background-image:url('https://svgs.scryfall.io/card-symbols/G.svg')!important}
.h164-mana-c{background-image:url('https://svgs.scryfall.io/card-symbols/C.svg')!important}
.h164-mana-token .h164-symbol{
  color:transparent!important;
  font-size:0!important;
  text-shadow:none!important;
}
.h164-mana-token .h164-value{
  color:#fff!important;
  font-size:14px!important;
  line-height:1!important;
  text-shadow:0 1px 2px #000,0 0 4px #000!important;
  background:rgba(0,0,0,.20)!important;
  width:22px!important;
  height:22px!important;
  border-radius:50%!important;
  display:grid!important;
  place-items:center!important;
}

/* Full-screen token editor: large centered mana symbol, about 80% of the visual
   footprint used by the card inspector, with controls beneath it. */
#h164-token-editor{padding:14px!important}
#h164-token-editor .h164-editor-box{
  width:min(96vw,520px)!important;
  min-height:min(86vh,650px)!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
  background:#211b17!important;
}
#h164-token-editor h3{margin:0 0 16px!important}
#h164-editor-token{
  position:relative!important;
  inset:auto!important;
  width:min(62vw,288px)!important;
  height:min(62vw,288px)!important;
  margin:0 auto 20px!important;
  border:0!important;
  box-shadow:0 12px 28px #0009!important;
  pointer-events:none!important;
}
#h164-editor-token .h164-value{
  width:min(24vw,108px)!important;
  height:min(24vw,108px)!important;
  font-size:min(13vw,58px)!important;
  background:rgba(0,0,0,.23)!important;
  text-shadow:0 2px 4px #000,0 0 8px #000!important;
}
#h164-editor-controls,#h164-keypad-wrap,#h164-editor-close{width:min(92%,360px)!important}
#h164-editor-controls{margin:0 auto!important}
#h164-keypad-wrap{margin-left:auto!important;margin-right:auto!important}
#h164-editor-close{margin-left:auto!important;margin-right:auto!important}
@media(max-width:390px){
  .h164-mana-token{width:31px!important;height:31px!important}
  #h164-editor-token{width:min(62vw,244px)!important;height:min(62vw,244px)!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  /* H164 calculates placement/drag bounds around a 46px token. Patch those
     constants to the new 32px footprint so spawning and free movement remain
     aligned with the visible token size. */
  out=out.replace(/const D=46;/g,'const D=32;');
  out=out.replace(/const D=46,gap=8/g,'const D=32,gap=8');

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h164.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
