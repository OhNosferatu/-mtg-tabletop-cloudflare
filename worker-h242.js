import h241 from './worker-h241.js';

const BUILD='H242';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h242-card-corner-shape'))return out;

  const css=`<style id="h242-card-corner-shape">
/* H241 proved the three battlefield views can share one clipping rule, but 7px
   is too aggressive at the current one-to-one mobile card size and visibly
   rounds away too much of the printed black border. Use a tighter physical
   radius while keeping the exact same shape on Your Side, Opponent, and Full
   Board. The image itself stays square; the wrapper performs the clip once. */
#field .card,
#oppcards .card,
#fullcards .card{
  border-radius:4px!important;
  overflow:hidden!important;
}
#field .card>img,
#oppcards .card>img,
#fullcards .card>img{
  border-radius:0!important;
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  out=out.replace('</body>','\n<!-- h242-card-corner-shape -->\n</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h241.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
