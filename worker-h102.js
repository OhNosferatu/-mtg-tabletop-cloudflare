import h101 from './worker-h101.js';

const BUILD='H102';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H102_FULL_BOARD_UNIFORM_SCALE'))return source;
  let out=source;

  // Each Full Board half is a centered 50%-scale copy of the normal battlefield.
  // X and Y use the exact same scale so the player's arrangement keeps its shape.
  out=out.replace(
    "const copy={...s,x:2+s.x*.96,y:51+s.y*.46};",
    "const copy={...s,x:25+s.x*.5,y:50+s.y*.5};"
  );
  out=out.replace(
    "const copy={...s,x:2+s.x*.96,y:1+s.y*.46};",
    "const copy={...s,x:25+s.x*.5,y:s.y*.5};"
  );

  const marker='\n/* H102_FULL_BOARD_UNIFORM_SCALE */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H101','H102').replaceAll('h101-','h102-');
  if(out.includes('h102-uniform-board-style'))return out;

  // Remove the redundant labels; the center divider and life totals already
  // communicate which half belongs to which player.
  out=out.replace('<div class="h102-half-label opp">OPPONENT</div><div class="h102-half-label you">YOUR SIDE</div>','');

  const css=`<style id="h102-uniform-board-style">
#full .title{display:none!important}
/* Roughly half of the normal mobile battlefield card width, matching the
   50% coordinate scale used for each miniature board. */
#fullcards .card{width:46px!important}
#fullcards .card .badge{font-size:6px!important;padding:2px 3px!important;right:1px!important;bottom:2px!important}
@media(max-width:390px){#fullcards .card{width:46px!important}}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h101.fetch(request,env,ctx);
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
