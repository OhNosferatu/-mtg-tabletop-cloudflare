import h133 from './worker-h133.js';

const BUILD='H134';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformHtml(source){
  let out=source.replace(/MTG TableTop\s+H\d+/g,'MTG TableTop '+BUILD)
                .replace(/Game loaded\s*[·.]\s*H\d+/g,'Game loaded · '+BUILD);
  if(out.includes('h134-divider-layout'))return out;

  const css=`<style id="h134-divider-layout">
/* H134 divider order:
   [ blue life + your hand ] [ turn switch ] [ turn + timer ] [ opp hand + red life ] */
#h105fullcontent>.h117-hand-count{display:none!important}

#h105divider{
  grid-template-columns:78px 88px minmax(96px,1fr) 78px!important;
  gap:4px!important;
  padding:5px!important;
}

.h134-side-box{
  height:44px!important;
  min-width:0!important;
  box-sizing:border-box!important;
  border:1px solid #6f5a42!important;
  border-radius:9px!important;
  background:#211b17!important;
  box-shadow:0 2px 5px #0007!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:5px!important;
  padding:4px 5px!important;
  color:#fff!important;
  overflow:hidden!important;
}
.h134-side-box[data-active="1"]{
  border-color:#d7b46a!important;
  box-shadow:0 0 0 1px rgba(215,180,106,.22),0 2px 6px #0008!important;
}

.h134-life-heart{
  position:relative!important;
  width:31px!important;
  height:29px!important;
  flex:0 0 31px!important;
  border:0!important;
  background:transparent!important;
  padding:0!important;
  margin:0!important;
  display:grid!important;
  place-items:center!important;
  touch-action:manipulation!important;
  color:#fff!important;
}
.h134-life-heart::before{
  content:'♥'!important;
  position:absolute!important;
  inset:0!important;
  display:grid!important;
  place-items:center!important;
  font-size:30px!important;
  line-height:1!important;
  filter:drop-shadow(0 1px 1px #0008)!important;
}
.h134-life-you::before{color:#3f8dff!important}
.h134-life-opp::before{color:#d83a3a!important}
.h134-life-heart span{
  position:relative!important;
  z-index:2!important;
  font:1000 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
  color:#fff!important;
  text-shadow:0 1px 2px #000,0 0 2px #000!important;
}

.h134-hand-block{
  min-width:0!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:4px!important;
  color:#f5ead8!important;
}
.h134-hand-icon{
  position:relative!important;
  display:block!important;
  width:11px!important;
  height:15px!important;
  flex:0 0 11px!important;
  border:1.5px solid #d7b46a!important;
  border-radius:2px!important;
  box-sizing:border-box!important;
  box-shadow:3px -3px 0 -1px #211b17,3px -3px 0 0 #8b7659!important;
}
.h134-hand-count{
  min-width:11px!important;
  text-align:center!important;
  font:1000 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
  color:#fff!important;
}

#h134-turn-switch{
  height:44px!important;
  min-width:0!important;
  border:1px solid #786246!important;
  border-radius:9px!important;
  background:#30271f!important;
  color:#f5ead8!important;
  padding:4px 5px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:4px!important;
  touch-action:manipulation!important;
  overflow:hidden!important;
}
#h134-turn-switch .h134-turn-label{
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  font:900 7px/1.05 ui-monospace,SFMono-Regular,Menlo,monospace!important;
  letter-spacing:.035em!important;
}
#h134-turn-switch .h134-swap{
  flex:0 0 auto!important;
  font:1000 14px/1 system-ui!important;
  color:#d7b46a!important;
}

.h134-match-stats{
  height:44px!important;
  min-width:0!important;
  box-sizing:border-box!important;
  display:grid!important;
  grid-template-rows:1fr 1fr!important;
  border:1px solid #66513e!important;
  border-radius:9px!important;
  overflow:hidden!important;
  background:#171310!important;
}
.h134-match-stats>span{
  min-width:0!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:4px!important;
  color:#cdbd9f!important;
  font:800 6px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
}
.h134-match-stats>span+span{border-top:1px solid #4f4031!important}
.h134-match-stats b,#h134-turn-timer{
  color:#fff!important;
  font:1000 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace!important;
}

@media(max-width:390px){
  #h105divider{grid-template-columns:74px 84px minmax(92px,1fr) 74px!important;gap:3px!important;padding-left:4px!important;padding-right:4px!important}
  .h134-side-box{padding-left:4px!important;padding-right:4px!important;gap:4px!important}
  .h134-life-heart{width:29px!important;height:28px!important;flex-basis:29px!important}
  .h134-life-heart::before{font-size:28px!important}
  .h134-hand-block{gap:3px!important}
  .h134-hand-count{font-size:10px!important}
  #h134-turn-switch .h134-turn-label{font-size:6.5px!important}
  .h134-match-stats b,#h134-turn-timer{font-size:9px!important}
}
</style>`;
  out=out.replace('</head>',css+'</head>');

  const script=`<script id="h134-divider-script">window.addEventListener('DOMContentLoaded',()=>{
    const install=()=>{
      const content=document.getElementById('h105fullcontent');
      const divider=document.getElementById('h105divider');
      if(!content||!divider){requestAnimationFrame(install);return}
      if(divider.dataset.h134Ready)return;
      if(!divider.dataset.h133Ready){requestAnimationFrame(install);return}
      divider.dataset.h134Ready='1';

      divider.innerHTML=''+
        '<div class="h134-side-box h134-you-box" data-side="you" data-active="1">'+
          '<button class="h134-life-heart h134-life-you" data-h134-life="you" aria-label="Your life total"><span>40</span></button>'+
          '<span class="h134-hand-block"><span class="h134-hand-icon" aria-hidden="true"></span><b class="h134-hand-count" data-h134-hand="you">0</b></span>'+
        '</div>'+
        '<button id="h134-turn-switch" aria-label="Switch active turn"><span class="h134-turn-label">YOUR TURN</span><span class="h134-swap">⇄</span></button>'+
        '<div class="h134-match-stats"><span>TURN <b id="h134-turn-count">1</b></span><span id="h134-turn-timer">00:00</span></div>'+
        '<div class="h134-side-box h134-opp-box" data-side="opp" data-active="0">'+
          '<span class="h134-hand-block"><b class="h134-hand-count" data-h134-hand="opp">0</b><span class="h134-hand-icon" aria-hidden="true"></span></span>'+
          '<button class="h134-life-heart h134-life-opp" data-h134-life="opp" aria-label="Opponent life total"><span>40</span></button>'+
        '</div>';

      const originalLife=side=>[...content.children].find(el=>el.classList?.contains('life-heart')&&el.dataset.life===side);
      const mirrorLife=side=>divider.querySelector('[data-h134-life="'+side+'"] span');
      const mirrorHand=side=>divider.querySelector('[data-h134-hand="'+side+'"]');
      const sourceHand=side=>document.querySelector('#h117-hand-'+side+' b');

      const syncLife=()=>{
        for(const side of['you','opp']){
          const src=originalLife(side)?.querySelector('span');
          const dst=mirrorLife(side);
          if(src&&dst&&dst.textContent!==src.textContent)dst.textContent=src.textContent;
        }
      };
      const syncHands=()=>{
        for(const side of['you','opp']){
          const src=sourceHand(side),dst=mirrorHand(side);
          if(src&&dst&&dst.textContent!==src.textContent)dst.textContent=src.textContent;
        }
      };

      for(const side of['you','opp']){
        const btn=divider.querySelector('[data-h134-life="'+side+'"]');
        btn?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();originalLife(side)?.click();setTimeout(syncLife,360)});
        btn?.addEventListener('contextmenu',e=>e.preventDefault());
      }

      let active='you',turn=1,started=Date.now();
      const label=divider.querySelector('.h134-turn-label');
      const count=divider.querySelector('#h134-turn-count');
      const timer=divider.querySelector('#h134-turn-timer');
      const turnButton=divider.querySelector('#h134-turn-switch');
      const formatTime=ms=>{const total=Math.max(0,Math.floor(ms/1000)),m=Math.floor(total/60),s=total%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')};
      const renderTurn=()=>{
        divider.dataset.turn=active;
        if(label)label.textContent=active==='you'?'YOUR TURN':'OPP TURN';
        if(count)count.textContent=String(turn);
        if(timer)timer.textContent=formatTime(Date.now()-started);
        const you=divider.querySelector('.h134-side-box[data-side="you"]');
        const opp=divider.querySelector('.h134-side-box[data-side="opp"]');
        if(you)you.dataset.active=active==='you'?'1':'0';
        if(opp)opp.dataset.active=active==='opp'?'1':'0';
      };
      turnButton?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();active=active==='you'?'opp':'you';turn+=1;started=Date.now();renderTurn()});

      for(const side of['you','opp']){
        const life=originalLife(side)?.querySelector('span');
        if(life)new MutationObserver(syncLife).observe(life,{childList:true,characterData:true,subtree:true});
        const hand=sourceHand(side);
        if(hand)new MutationObserver(syncHands).observe(hand,{childList:true,characterData:true,subtree:true});
      }
      const handLayerObserver=new MutationObserver(syncHands);
      handLayerObserver.observe(content,{childList:true,subtree:true,characterData:true});

      syncLife();syncHands();renderTurn();
      setInterval(()=>{renderTurn();syncLife();syncHands()},250);
    };
    install();
  });</script>`;
  out=out.replace('</body>',script+'</body>');
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    const response=await h133.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(transformHtml(text),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
