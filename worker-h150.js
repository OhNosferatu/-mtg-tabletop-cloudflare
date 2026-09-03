import h149 from './worker-h149.js';

const BUILD='H150';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)
                .replace(/>Discard<\/button>/g,'>Graveyard</button>');
  if(out.includes('h150-pile-order-graveyard'))return out;

  const css=`<style id="h150-pile-order-graveyard">
/* H150 pile convention going forward:
   Player perspective: Commander -> Exile -> Deck -> Graveyard -> Tokens.
   Opponent Full Board half remains vertically mirrored to face its player:
   Tokens -> Graveyard -> Deck -> Exile -> Commander. */

/* Dedicated Your Side board. Keep the existing five pile slots and only swap
   Exile and Graveyard; no battlefield or card geometry changes. */
#you .cmds{top:13.5%!important}
#you .exile{top:30%!important}
#you .deck{top:46.5%!important}
#you .discard{top:63%!important}
#you .tokens{top:79.5%!important}

/* Full Board — your lower half. H133 preserves each half at normal board size. */
#h116-piles-you .h116-cmd{top:55.75%!important}
#h116-piles-you .h116-exile{top:64.125%!important}
#h116-piles-you .h116-deck{top:72.5%!important}
#h116-piles-you .h116-discard{top:80.875%!important}
#h116-piles-you .h116-tokens{top:89.25%!important}

/* Full Board — opponent upper half, mirrored vertically from the new order. */
#h116-piles-opp .h116-tokens{top:5.75%!important}
#h116-piles-opp .h116-discard{top:14.125%!important}
#h116-piles-opp .h116-deck{top:22.5%!important}
#h116-piles-opp .h116-exile{top:30.875%!important}
#h116-piles-opp .h116-cmd{top:39.25%!important}

/* The internal zone key remains "discard" for save/game compatibility, but the
   player-facing MTG term is Graveyard everywhere. */
.discard::after{content:'GRAVEYARD'!important}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h150-pile-order-graveyard-script">window.addEventListener('DOMContentLoaded',()=>{
    const rename=()=>{
      document.querySelectorAll('.discard').forEach(el=>{el.dataset.name='GRAVEYARD'});
      const button=document.getElementById('todiscard');
      if(button&&button.textContent.trim()!=='Graveyard')button.textContent='Graveyard';
    };
    rename();
    document.querySelectorAll('[data-v]').forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(rename)));
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h149.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
