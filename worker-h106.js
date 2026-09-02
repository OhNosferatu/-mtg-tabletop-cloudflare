import h105 from './worker-h105.js';

const BUILD='H106';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H106_FULL_BOARD_POSITION_FIX'))return source;
  let out=source;

  // H105 uniformly shrank the battlefield coordinates around the center. That
  // made cards which were placed left/right or far apart on Your Side drift
  // toward the middle and bunch together in Full Board. Instead, preserve the
  // card's percentage position across the full width of its player's half.
  // Each player's half is exactly 50% of the continuous virtual table.
  out=out.replace(
    "const copy={...s,x:29+s.x*.42,y:61.35+s.y*.273};",
    "const copy={...s,x:2+s.x*.96,y:50+s.y*.5};"
  );
  out=out.replace(
    "const copy={...s,x:29+s.x*.42,y:11.35+s.y*.273};",
    "const copy={...s,x:2+s.x*.96,y:s.y*.5};"
  );

  const marker='\n/* H106_FULL_BOARD_POSITION_FIX */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H105','H106');
  if(out.includes('h106-fullboard-card-fix'))return out;

  const css=`<style id="h106-fullboard-card-fix">
/* Keep Full Board cards large enough to read while still clearly miniature. */
#fullcards .card{width:clamp(52px,14.5vw,60px)!important}
/* Never crop Scryfall artwork/card frames in the overview. */
#fullcards .card img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;background:#111!important}
/* Slightly reduce the shadow so nearby cards remain visually distinct. */
#fullcards .full-opp-card,#fullcards .full-you-card{filter:drop-shadow(0 3px 5px rgba(0,0,0,.34))!important}
@media(max-width:390px){#fullcards .card{width:clamp(50px,14.5vw,57px)!important}}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h105.fetch(request,env,ctx);
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
