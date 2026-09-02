import h106 from './worker-h106.js';

const BUILD='H107';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  if(source.includes('H107_FULL_CARD_IMAGE_FIX'))return source;
  let out=source;

  // Give Full Board copies their own explicit miniature-card class so their
  // image sizing can be completely isolated from normal battlefield cards.
  out=out.replace(
    "el.classList.add('full-you-card');",
    "el.classList.add('full-you-card','full-mini-card');"
  );
  out=out.replace(
    "el.classList.add('full-opp-card');",
    "el.classList.add('full-opp-card','full-mini-card');"
  );

  const marker='\n/* H107_FULL_CARD_IMAGE_FIX */\n';
  const end=out.lastIndexOf('})();');
  if(end>=0)out=out.slice(0,end)+marker+out.slice(end);
  return out;
}

function transformHtml(source){
  let out=source.replaceAll('H106','H107');
  if(out.includes('h107-full-card-image-style'))return out;

  const css=`<style id="h107-full-card-image-style">
/* Full Board cards use the Scryfall image's natural aspect ratio instead of
   inheriting the normal battlefield crop box. This guarantees the complete
   card face remains visible at miniature scale. */
#fullcards .full-mini-card,
#fullcards .full-you-card,
#fullcards .full-opp-card{
  width:clamp(54px,15vw,62px)!important;
  height:auto!important;
  aspect-ratio:auto!important;
  overflow:visible!important;
  background:transparent!important;
  border-radius:0!important;
  box-shadow:none!important;
}
#fullcards .full-mini-card>img,
#fullcards .full-you-card>img,
#fullcards .full-opp-card>img{
  display:block!important;
  position:relative!important;
  inset:auto!important;
  width:100%!important;
  height:auto!important;
  max-width:none!important;
  max-height:none!important;
  aspect-ratio:auto!important;
  object-fit:fill!important;
  object-position:center!important;
  border-radius:5px!important;
  background:#111!important;
  pointer-events:none!important;
  clip-path:none!important;
}
#fullcards .full-mini-card .badge,
#fullcards .full-you-card .badge,
#fullcards .full-opp-card .badge{
  font-size:5px!important;
  padding:2px 3px!important;
  right:1px!important;
  bottom:1px!important;
}
#fullcards .full-mini-card,
#fullcards .full-you-card,
#fullcards .full-opp-card{
  filter:drop-shadow(0 3px 5px rgba(0,0,0,.34))!important;
}
@media(max-width:390px){
  #fullcards .full-mini-card,
  #fullcards .full-you-card,
  #fullcards .full-opp-card{width:clamp(52px,14.5vw,59px)!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h106.fetch(request,env,ctx);
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
