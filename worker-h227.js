import h226 from './worker-h226.js';

const BUILD='H227';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h227-block-legacy-visible-child-during-stage'))return out;

  const css=`<style id="h227-block-legacy-visible-child-during-stage">
/* H227: H226 correctly hides the #full parent during Your Side -> Full Board,
   but H222 contains a more specific rule that explicitly sets the Full Board
   viewport/scrollbar back to visibility:visible while H197's settling class is
   active. A child can override inherited visibility from a hidden parent, which
   is why Safari could still paint the opponent/top frame during this one path.

   During the H226 stage, explicitly keep those exact children hidden with a
   higher-specificity selector. Once H226 removes its stage class, this rule no
   longer applies and Full Board reveals normally at the already-set player anchor. */
body.h226-stage-your-to-full.h197-full-settling #full.screen #h105fullviewport,
body.h226-stage-your-to-full.h197-full-settling #full.screen #h105fullscroll,
body.h226-stage-your-to-full #full.screen #h105fullviewport,
body.h226-stage-your-to-full #full.screen #h105fullscroll{
  visibility:hidden!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  const marker='\n<!-- h227-block-legacy-visible-child-during-stage -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h226.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
