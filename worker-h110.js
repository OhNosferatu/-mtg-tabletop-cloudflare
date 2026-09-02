import h109 from './worker-h109.js';

const BUILD='H110';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H109','H110');
  if(out.includes('h110-fullboard-land-zones'))return out;

  const css=`<style id="h110-fullboard-land-zones">
/* Full Board land zones mirror the land area used on Your Side. Each zone is
   sized relative to its player's 50%-height half of the continuous table. */
#h105fullcontent::before,
#h105fullcontent::after{
  content:"";
  position:absolute;
  left:16%;
  right:5%;
  height:13.5%;
  z-index:3;
  border:1.5px solid rgba(24,55,36,.78);
  border-radius:10px;
  background:rgba(24,55,36,.12);
  box-shadow:inset 0 0 0 1px rgba(13,38,25,.16);
  pointer-events:none;
}
/* Opponent land zone: bottom 27% of the opponent's top half. */
#h105fullcontent::before{top:34%}
/* Your land zone: bottom 27% of your lower half. */
#h105fullcontent::after{top:84%}
@media(max-width:390px){
  #h105fullcontent::before,
  #h105fullcontent::after{left:16%;right:4%;height:13.5%}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h109.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
