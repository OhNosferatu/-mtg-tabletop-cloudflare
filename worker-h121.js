import h120 from './worker-h120.js';

const BUILD='H121';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H120','H121');
  if(out.includes('h121-mirror-opponent-piles'))return out;

  const css=`<style id="h121-mirror-opponent-piles">
/* Mirror the opponent pile column vertically across the center line.
   Player:   Commander -> Discard -> Deck -> Exile -> Tokens
   Opponent: Tokens -> Exile -> Deck -> Discard -> Commander */
#h116-piles-opp .h116-tokens{top:5.75%!important}
#h116-piles-opp .h116-exile{top:14.125%!important}
#h116-piles-opp .h116-deck{top:22.5%!important}
#h116-piles-opp .h116-discard{top:30.875%!important}
#h116-piles-opp .h116-cmd{top:39.25%!important}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h120.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
