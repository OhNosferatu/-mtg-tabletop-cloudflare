import h108 from './worker-h108.js';

const BUILD='H109';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replaceAll('H108','H109');
  if(out.includes('h109-fullboard-scrollbar-style'))return out;

  const css=`<style id="h109-fullboard-scrollbar-style">
/* Full Board scrubber: move the control inward and give it a much larger
   touch target while matching the table's dark wood / brass visual language. */
#h105fullscroll{
  right:8px!important;
  top:7%!important;
  height:86%!important;
  width:34px!important;
  margin:0!important;
  padding:0 11px!important;
  opacity:1!important;
  background:transparent!important;
  accent-color:#d3ad70!important;
  touch-action:none!important;
  z-index:65!important;
}
#h105fullscroll::-webkit-slider-runnable-track{
  width:8px!important;
  border-radius:999px!important;
  background:linear-gradient(90deg,#241c16,#4d3a2b 45%,#241c16)!important;
  border:1px solid #806447!important;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.35),0 0 0 1px rgba(211,173,112,.08)!important;
}
#h105fullscroll::-webkit-slider-thumb{
  -webkit-appearance:none!important;
  appearance:none!important;
  width:28px!important;
  height:40px!important;
  margin-left:-11px!important;
  border-radius:9px!important;
  background:linear-gradient(180deg,#5a4634,#2b2119)!important;
  border:2px solid #d3ad70!important;
  box-shadow:inset 0 0 0 1px rgba(255,235,196,.12),0 3px 7px rgba(0,0,0,.48)!important;
}
#h105fullscroll:active::-webkit-slider-thumb{
  background:linear-gradient(180deg,#6a523c,#34271d)!important;
  border-color:#e3c58e!important;
}
@media(max-width:390px){
  #h105fullscroll{
    right:7px!important;
    width:32px!important;
    padding:0 10px!important;
  }
  #h105fullscroll::-webkit-slider-thumb{
    width:27px!important;
    height:38px!important;
    margin-left:-10px!important;
  }
}
</style>`;
  out=out.replace('</head>',css+'</head>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h108.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
