import h211 from './worker-h211.js';

const BUILD='H212';
function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}
function stamp(source){return source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD).replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD)}

function transformApp(source){
  let out=source;
  if(out.includes('H212_FACE_DOWN_REVEAL_RELIABILITY'))return out;

  const oldFlip="if(a==='flip'){c.faceDown=!c.faceDown;const zi=z.querySelector('img'),zs=displayImage(c)||'';if(zi){if(zs)zi.setAttribute('src',zs);else zi.removeAttribute('src')}syncFaceVisual(c);refreshBoardZoom();return}";
  const newFlip=`if(a==='flip'){
    /* H212_FACE_DOWN_REVEAL_RELIABILITY
       A face-down battlefield card may not have fetched its front artwork yet.
       On the first Flip tap, load that artwork first and then complete the reveal
       automatically. This removes the old timing race where repeated viewer
       opens / Flip taps were needed before the front image became available. */
    const finish=()=>{
      const zi=z.querySelector('img'),zs=displayImage(c)||'';
      if(zi){if(zs)zi.setAttribute('src',zs);else zi.removeAttribute('src')}
      syncFaceVisual(c);render();refreshBoardZoom();
    };
    if(c.faceDown&&!frontImage(c)){
      const zi=z.querySelector('img');if(zi)zi.setAttribute('src',BACK);
      load(c).then(()=>{c.faceDown=false;finish()}).catch(()=>{c.faceDown=false;finish()});
      return;
    }
    c.faceDown=!c.faceDown;finish();return;
  }`;
  out=out.replace(oldFlip,newFlip);
  return out;
}

function transformHtml(source){return stamp(source)}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h211.fetch(request,env,ctx);
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
