import h138 from './worker-h138.js';

const BUILD='H139';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h139-neutral-gray-board'))return out;

  const css=`<style id="h139-neutral-gray-board">
/* H139: replace the old green felt/base treatment with a neutral graphite gray.
   Blue/red player identity accents from H137 remain untouched. Geometry and
   interactions are unchanged. */
.board{
  background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.035),transparent 48%),linear-gradient(#484b4f,#303338)!important;
  border-color:#4b4743!important;
  box-shadow:inset 0 0 0 5px #292622,inset 0 0 0 8px #66594d!important;
}

/* Neutralize the old green cast inside empty pile/zone boxes. H137's blue/red
   owner borders and labels still layer on top of these neutral surfaces. */
.zone,.cmd{
  background:rgba(150,154,160,.055)!important;
  box-shadow:inset 0 4px 12px rgba(20,22,24,.28)!important;
}
.zone:before,.cmd:before{color:rgba(220,224,228,.20)!important}

/* Land zones stay intentionally subtle and neutral instead of taking either
   player's accent color. */
#you .land-zone,
.h133-land-zone{
  border-color:rgba(145,150,156,.48)!important;
  background:rgba(130,135,140,.07)!important;
  box-shadow:inset 0 0 0 1px rgba(210,214,218,.045)!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h138.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
