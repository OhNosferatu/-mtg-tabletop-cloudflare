import h159 from './worker-h159.js';

const BUILD='H160';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h160-opponent-heart-match'))return out;

  const css=`<style id="h160-opponent-heart-match">
/* H160: remove the Opponent label and make the opponent life heart match the
   Your Side heart exactly in size/vertical placement, mirrored to the left. */
body.h157-opp-mode #opp .title{display:none!important}
body.h157-opp-mode #h157-opp-life{
  width:58px!important;
  height:52px!important;
  top:6px!important;
  bottom:auto!important;
  left:7px!important;
  right:auto!important;
}
body.h157-opp-mode #h157-opp-life::before{
  font-size:53px!important;
}
body.h157-opp-mode #h157-opp-life span{
  font-size:16px!important;
}
@media(max-width:390px){
  body.h157-opp-mode #h157-opp-life{
    width:54px!important;
    height:49px!important;
    top:6px!important;
    left:7px!important;
  }
  body.h157-opp-mode #h157-opp-life::before{font-size:49px!important}
  body.h157-opp-mode #h157-opp-life span{font-size:15px!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h159.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
