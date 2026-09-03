import h158 from './worker-h158.js';

const BUILD='H159';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h159-opponent-header-align'))return out;

  const css=`<style id="h159-opponent-header-align">
/* H159: align the Opponent label and life heart to the same centerline as the
   mirrored pile column, and separate them vertically so they no longer overlap. */
body.h157-opp-mode #opp .title{
  display:block!important;
  left:1.4%!important;
  top:6px!important;
  width:64px!important;
  padding:0!important;
  background:transparent!important;
  border-radius:0!important;
  text-align:center!important;
  font-size:8px!important;
  letter-spacing:.08em!important;
  line-height:12px!important;
  z-index:40!important;
}
body.h157-opp-mode #h157-opp-life{
  top:22px!important;
  bottom:auto!important;
  left:calc(1.4% + 5px)!important;
  right:auto!important;
}
@media(min-width:601px){
  body.h157-opp-mode #opp .title{width:69px!important}
  body.h157-opp-mode #h157-opp-life{left:calc(1.4% + 7.5px)!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h158.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
