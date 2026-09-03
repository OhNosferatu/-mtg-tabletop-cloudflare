import h218 from './worker-h218.js';

const BUILD='H219';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformHtml(source){
  let out=stamp(source);
  if(out.includes('h219-fullboard-fixed-divider-anchor'))return out;

  /* H219 changes Full Board opening from "restore where I left off" to one
     deterministic visual anchor: the match divider sits flush with the top of
     the Full Board viewport, exactly like the user's reference screenshot.
     H218 already disables the older center/top reset handlers, so H178 is now
     the only opening-position owner. Feed H178 the divider's real DOM offset
     instead of its saved-scroll value. */
  out=out.replace(
    'const wanted=savedScroll;',
    "const divider=document.getElementById('h105divider');const wanted=Math.max(0,divider?.offsetTop||0);/* h219-fullboard-fixed-divider-anchor */"
  );

  /* Also seed the saved value with that same anchor during the existing H178
     restore sequence. This prevents its 90ms follow-up from ever reintroducing
     an older remembered position. */
  out=out.replace(
    'savedScroll=wanted;restoreScroll();\n        setTimeout(()=>{savedScroll=wanted;restoreScroll()},90);',
    "savedScroll=wanted;try{sessionStorage.setItem('mtg_full_scroll_v2',String(wanted))}catch{}restoreScroll();\n        setTimeout(()=>{savedScroll=wanted;try{sessionStorage.setItem('mtg_full_scroll_v2',String(wanted))}catch{}restoreScroll()},90);"
  );

  const marker='\n<!-- h219-fullboard-fixed-divider-anchor -->\n';
  out=out.replace('</body>',marker+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h218.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
