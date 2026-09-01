(()=>{
const $=s=>document.querySelector(s);
const st={cards:{},deck:[],hand:[],cmd:[],side:[],tokens:[],discard:[],exile:[],field:[],opp:[],view:"you",life:{you:40,opp:40}};
let seq=0,preview=null,lastTap={};

const BACK="https://cards.scryfall.io/back.png";

const toast=t=>{
  const e=$("#toast");
  if(!e)return;
  e.textContent=t;
  e.classList.add("on");
  clearTimeout(e.t);
  e.t=setTimeout(()=>e.classList.remove("on"),1200);
};

function make(name,zone,meta={}){
  const id="c"+(++seq);
  st.cards[id]={
    id,name,zone,img:"",faces:[],isDoubleFaced:false,stateIndex:0,faceDown:false,
    x:40,y:40,tap:false,p1:0,p:null,t:null,meta:{...meta}
  };
  return id;
}

async function load(c){
  if(!c || (c.img&&c.faces.length)) return;
  try{
    let q="/api/card?name="+encodeURIComponent(c.name);
    if(c.meta?.scryfallId) q+="&id="+encodeURIComponent(c.meta.scryfallId);
    const r=await fetch(q);
    if(!r.ok)return;
    const d=await r.json();
    c.img=d.image||"";
    c.faces=Array.isArray(d.faces)&&d.faces.length?d.faces:[{name:c.name,image:c.img}];
    c.isDoubleFaced=!!d.isDoubleFaced && c.faces.length>1;
    c.meta.scryfallId=d.scryfallId||c.meta.scryfallId;
  }catch{}
}

function frontImage(c){
  return c.faces?.[c.stateIndex]?.image || c.img || "";
}

function displayImage(c){
  return c.faceDown ? BACK : frontImage(c);
}

function face(c){
  const src=displayImage(c);
  return src?`<img src="${src}" draggable="false">`:`<div class="cardname">${c.name}</div>`;
}

function removeFromAll(id){
  ["deck","hand","cmd","side","tokens","discard","exile","field"].forEach(k=>{
    const a=st[k],i=a.indexOf(id);
    if(i>=0)a.splice(i,1);
  });
}

function putInZone(id,zone,atTop=false){
  const c=st.cards[id];
  if(!c)return;
  removeFromAll(id);
  c.zone=zone;
  c.tap=false;
  if(zone==="hand"){
    c.faceDown=false;
    st.hand.push(id);
  }else if(zone==="field"){
    st.field.push(id);
  }else if(zone==="cmd"){
    c.faceDown=false;
    atTop?st.cmd.unshift(id):st.cmd.push(id);
  }else{
    const a=st[zone];
    if(!a)return;
    atTop?a.unshift(id):a.push(id);
  }
}

function bringFront(id){
  const i=st.field.indexOf(id);
  if(i>=0){st.field.splice(i,1);st.field.push(id);}
}

function pointInRect(x,y,r){
  return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}

function overlapRatio(a,b){
  const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
  const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  return a.width&&a.height?(w*h)/(a.width*a.height):0;
}

function fieldRect(){
  return $("#field").getBoundingClientRect();
}

function placeOnField(id,x,y,faceDown=null){
  const c=st.cards[id];
  if(!c)return;
  putInZone(id,"field");
  if(faceDown!==null)c.faceDown=faceDown;
  const r=fieldRect();
  const cardW=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-w"))||52;
  const cardH=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-h"))||73;
  c.x=Math.max(0,Math.min(100-cardW/r.width*100,(x-r.left-cardW/2)/r.width*100));
  c.y=Math.max(0,Math.min(100-cardH/r.height*100,(y-r.top-cardH/2)/r.height*100));
  bringFront(id);
}

function handHit(x,y){
  const h=$("#hand");
  return h && pointInRect(x,y,h.getBoundingClientRect());
}

function snapTargetFor(el,c){
  const a=el.getBoundingClientRect();
  const zones=[
    {sel:"#discard",zone:"discard"},
    {sel:"#deck",zone:"deck"},
    {sel:"#exile",zone:"exile"},
    {sel:"#tokens",zone:"tokens"},
    {sel:"#cmds .cmd",zone:"cmd",commanderOnly:true}
  ];
  let best=null,bestRatio=0;
  for(const z of zones){
    if(z.commanderOnly&&!c.meta?.commander)continue;
    const elz=$(z.sel);
    if(!elz)continue;
    const ratio=overlapRatio(a,elz.getBoundingClientRect());
    if(ratio>=.80&&ratio>bestRatio){best=z;bestRatio=ratio;}
  }
  return best;
}

function openCard(c,controls=true){
  if(!c)return;
  preview=c;
  const img=$("#pimg");
  img.src=displayImage(c)||"";
  $("#ctrl").classList.toggle("on",controls);
  $("#state").hidden=!c.isDoubleFaced;
  $("#inspect").classList.add("on");
  if(!c.img)load(c).then(()=>{
    if(preview===c){
      img.src=displayImage(c)||"";
      $("#state").hidden=!c.isDoubleFaced;
    }
  });
}

function rerenderPreview(){
  if(!preview)return;
  $("#pimg").src=displayImage(preview)||"";
  $("#state").hidden=!preview.isDoubleFaced;
}

function cardEl(c,movable=true){
  const d=document.createElement("div");
  d.className="card"+(c.tap?" tap":"");
  d.dataset.id=c.id;
  d.style.left=c.x+"%";
  d.style.top=c.y+"%";
  d.innerHTML=face(c);

  if(movable&&(c.p1||c.p!==null||c.t!==null)){
    const b=document.createElement("button");
    b.className="badge";
    b.textContent=c.p!==null||c.t!==null?((c.p??0)+c.p1)+"/"+((c.t??0)+c.p1):"+"+c.p1+"/+"+c.p1;
    b.onclick=e=>{e.stopPropagation();c.p1++;render();};
    d.appendChild(b);
  }

  if(!movable){d.onclick=()=>openCard(c,false);return d;}

  let drag=null,moved=false;

  d.onpointerdown=e=>{
    e.preventDefault();
    moved=false;
    bringFront(c.id);
    d.style.zIndex=100;
    const r=fieldRect(),q=d.getBoundingClientRect();
    drag={r,dx:e.clientX-q.left,dy:e.clientY-q.top,sx:e.clientX,sy:e.clientY,pid:e.pointerId};
    d.setPointerCapture?.(e.pointerId);
  };

  d.onpointermove=e=>{
    if(!drag)return;
    const dist=Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy);
    if(dist>4)moved=true;
    if(!moved)return;
    const x=Math.max(0,Math.min(drag.r.width-d.offsetWidth,e.clientX-drag.r.left-drag.dx));
    const y=Math.max(0,Math.min(drag.r.height-d.offsetHeight,e.clientY-drag.r.top-drag.dy));
    c.x=x/drag.r.width*100;
    c.y=y/drag.r.height*100;
    d.style.left=c.x+"%";
    d.style.top=c.y+"%";
  };

  d.onpointerup=e=>{
    if(!drag)return;
    d.releasePointerCapture?.(drag.pid);
    drag=null;

    if(moved){
      if(handHit(e.clientX,e.clientY)){
        putInZone(c.id,"hand");
        render();
        toast("Card returned to hand");
        return;
      }

      const snap=snapTargetFor(d,c);
      if(snap){
        putInZone(c.id,snap.zone,snap.zone==="deck");
        if(snap.zone==="deck")c.faceDown=true;
        if(snap.zone==="cmd")c.faceDown=false;
        render();
        toast("Snapped to "+(snap.zone==="discard"?"graveyard":snap.zone));
        return;
      }

      bringFront(c.id);
      render();
      return;
    }

    const now=Date.now(),prev=lastTap[c.id]||0;
    if(now-prev<330){
      clearTimeout(lastTap[c.id+"_timer"]);
      lastTap[c.id]=0;
      openCard(c,true);
    }else{
      lastTap[c.id]=now;
      lastTap[c.id+"_timer"]=setTimeout(()=>{
        if(lastTap[c.id]===now){
          c.tap=!c.tap;
          lastTap[c.id]=0;
          render();
        }
      },330);
    }
  };

  d.onpointercancel=()=>{drag=null;};
  d.oncontextmenu=e=>e.preventDefault();
  return d;
}

function makeGhost(c,forceBack=false){
  const g=document.createElement("div");
  g.className="drag-ghost";
  const src=forceBack?BACK:displayImage(c);
  g.innerHTML=src?`<img src="${src}" draggable="false">`:`<span>${c.name}</span>`;
  document.body.appendChild(g);
  return g;
}

function zoneDrag(el,id,from,{forceBack=false,label=""}={}){
  const c=st.cards[id];
  if(!c)return;
  let s=null,ghost=null,moved=false;

  el.onpointerdown=e=>{
    if(e.target.closest(".count"))e.preventDefault();
    s={x:e.clientX,y:e.clientY,pid:e.pointerId};
    moved=false;
    el.setPointerCapture?.(e.pointerId);
  };

  el.onpointermove=e=>{
    if(!s)return;
    if(!moved&&Math.hypot(e.clientX-s.x,e.clientY-s.y)>8){
      moved=true;
      ghost=makeGhost(c,forceBack);
    }
    if(ghost){
      ghost.style.left=e.clientX+"px";
      ghost.style.top=e.clientY+"px";
    }
  };

  el.onpointerup=e=>{
    if(!s)return;
    s=null;
    ghost?.remove();

    if(!moved){
      openCard(c,true);
      return;
    }

    if(handHit(e.clientX,e.clientY)){
      putInZone(id,"hand");
      render();
      toast("Moved to hand");
      return;
    }

    const r=fieldRect();
    if(pointInRect(e.clientX,e.clientY,r)){
      placeOnField(id,e.clientX,e.clientY,forceBack?true:false);
      render();
      toast(label||"Moved to battlefield");
    }
  };
  el.onpointercancel=()=>{s=null;ghost?.remove();};
  el.oncontextmenu=e=>e.preventDefault();
}

function handCard(id){
  const c=st.cards[id],d=document.createElement("div");
  d.className="hcard";
  d.dataset.id=id;
  d.innerHTML=face(c);
  let s=null,moved=false,scrollMode=false;

  d.onpointerdown=e=>{
    e.preventDefault();
    const row=$("#handrow");
    s={x:e.clientX,y:e.clientY,pid:e.pointerId,scrollTop:row.scrollTop};
    moved=false;
    scrollMode=false;
    d.setPointerCapture?.(e.pointerId);
  };

  d.onpointermove=e=>{
    if(!s)return;
    const dx=e.clientX-s.x,dy=e.clientY-s.y;
    const handRect=$("#hand").getBoundingClientRect();
    const open=$("#hand").classList.contains("open");

    if(open && pointInRect(e.clientX,e.clientY,handRect) && !moved){
      if(Math.abs(dy)>8 && Math.abs(dy)>Math.abs(dx)*1.15){
        scrollMode=true;
      }
    }

    if(scrollMode){
      $("#handrow").scrollTop=s.scrollTop-dy;
      return;
    }

    if(Math.hypot(dx,dy)>10)moved=true;
  };

  d.onpointerup=e=>{
    if(!s)return;
    d.releasePointerCapture?.(s.pid);
    s=null;

    if(scrollMode){
      scrollMode=false;
      return;
    }

    if(!moved){
      openCard(c,true);
      return;
    }

    const b=fieldRect();
    if(pointInRect(e.clientX,e.clientY,b)&&!handHit(e.clientX,e.clientY)){
      placeOnField(id,e.clientX,e.clientY,false);
      $("#hand").classList.remove("open");
      render();
      return;
    }

    const under=document.elementsFromPoint(e.clientX,e.clientY).find(x=>x.classList?.contains("hcard")&&x.dataset.id!==id);
    if(under){
      const from=st.hand.indexOf(id),to=st.hand.indexOf(under.dataset.id);
      st.hand.splice(from,1);
      st.hand.splice(to,0,id);
      render();
      toast("Hand reordered");
    }
  };

  d.oncontextmenu=e=>e.preventDefault();
  return d;
}

function renderPile(el,arr,label,{back=false,draggable=false,from=null,forceBack=false}={}){
  el.innerHTML="";
  el.classList.toggle("empty",!arr.length);
  const id=arr[0],c=id?st.cards[id]:null;
  if(c){
    if(back){
      const img=document.createElement("img");
      img.src=BACK;
      img.draggable=false;
      el.appendChild(img);
    }else{
      el.insertAdjacentHTML("beforeend",face(c));
    }
  }
  el.insertAdjacentHTML("beforeend",`<span class="count">${arr.length}</span>`);
  if(c&&draggable)zoneDrag(el,id,from,{forceBack,label});
  else el.onclick=()=>c?openCard(c,true):toast(label+" empty");
}

function renderLife(){
  document.querySelectorAll(".life-heart[data-life]").forEach(el=>{
    el.querySelector("span").textContent=st.life[el.dataset.life];
  });
}

function render(){
  const f=$("#field"),h=$("#handrow"),o=$("#oppcards"),ff=$("#fullcards");
  f.innerHTML=h.innerHTML=o.innerHTML=ff.innerHTML="";

  st.field.forEach(id=>f.appendChild(cardEl(st.cards[id],true)));
  st.opp.forEach(id=>o.appendChild(cardEl(st.cards[id],false)));

  st.field.forEach(id=>{
    const src=st.cards[id];
    const copy={...src,x:18+src.x*.62,y:54+src.y*.32};
    ff.appendChild(cardEl(copy,false));
  });

  st.opp.forEach(id=>{
    const src=st.cards[id];
    const copy={...src,x:18+src.x*.62,y:4+src.y*.32};
    ff.appendChild(cardEl(copy,false));
  });

  st.hand.forEach(id=>h.appendChild(handCard(id)));
  $("#hand").classList.toggle("empty",!st.hand.length);

  const ca=$("#cmds");
  ca.innerHTML="";
  if(!st.cmd.length){
    const e=document.createElement("div");
    e.className="cmd";
    e.dataset.name="COMMANDER";
    e.dataset.icon="♛";
    e.innerHTML='<span class="count">0</span>';
    ca.appendChild(e);
  }else{
    st.cmd.slice(0,2).forEach(id=>{
      const c=st.cards[id],e=document.createElement("div");
      e.className="cmd";
      e.dataset.name="COMMANDER";
      e.dataset.icon="♛";
      e.innerHTML=face(c)+'<span class="count">1</span>';
      ca.appendChild(e);
      zoneDrag(e,id,"cmd",{label:"Commander to battlefield"});
    });
  }

  renderPile($("#discard"),st.discard,"Graveyard",{draggable:true,from:"discard"});
  renderPile($("#deck"),st.deck,"Deck",{back:true,draggable:true,from:"deck",forceBack:true,label:"Drew face-down to battlefield"});
  renderPile($("#exile"),st.exile,"Exile",{draggable:true,from:"exile"});
  renderPile($("#tokens"),st.tokens,"Tokens",{draggable:true,from:"tokens",label:"Token to battlefield"});
  renderPile($("#side"),st.side,"Sideboard");

  renderLife();
}

function expand(items,z){
  const out=[];
  (items||[]).forEach(x=>{
    const q=typeof x==="string"?1:+x.quantity||1;
    const n=typeof x==="string"?x:x.name;
    for(let i=0;i<q;i++)out.push(make(n,z,typeof x==="string"?{}:x));
  });
  return out;
}

function applyDeck(d){
  st.cards=Object.fromEntries(Object.entries(st.cards).filter(([_,c])=>c.zone==="opp"));
  st.field=[];st.hand=[];st.discard=[];st.exile=[];
  st.cmd=expand(d.commander,"cmd");
  st.deck=expand(d.deck,"deck");
  st.deck.forEach(id=>st.cards[id].faceDown=true);
  st.side=expand(d.sideboard,"side");
  st.tokens=expand(d.tokens,"tokens");
  [...st.cmd.slice(0,2),st.side[0],st.tokens[0]].filter(Boolean).forEach(id=>load(st.cards[id]).then(render));
  render();
  toast("Deck imported");
}

async function importDeck(){
  const r=await fetch("/api/import-archidekt",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({url:$("#url").value.trim()})
  });
  let d;
  try{d=await r.json();}catch{throw Error("Importer returned an invalid response");}
  if(!r.ok)throw Error((d.error||"Import failed")+(d.detail?" · "+d.detail:""));
  applyDeck(d);
}

function parseList(t){
  const r={commander:[],deck:[],sideboard:[],tokens:[]};
  let z="deck";
  t.split(/\r?\n/).forEach(l=>{
    l=l.trim();
    if(!l)return;
    const h=l.toLowerCase().replace(/:$/,'');
    if(/^commander/.test(h)){z="commander";return;}
    if(/^sideboard/.test(h)){z="sideboard";return;}
    if(/^tokens?/.test(h)){z="tokens";return;}
    const m=l.match(/^(\d+)\s*x?\s+(.+)$/i);
    if(m)r[z].push({name:m[2],quantity:+m[1],commander:z==="commander",token:z==="tokens"});
  });
  return r;
}

function shuffle(a){
  for(let i=a.length-1;i;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

async function drawOne(){
  if(!st.deck.length)return toast("Deck empty");
  const id=st.deck.shift(),c=st.cards[id];
  c.zone="hand";
  c.faceDown=false;
  st.hand.push(id);
  await load(c);
  render();
  toast("Drew 1");
}

async function mulligan(){
  if(!st.deck.length&&!st.hand.length)return toast("Import a deck first");
  while(st.hand.length){
    const id=st.hand.pop();
    st.cards[id].zone="deck";
    st.deck.push(id);
  }
  shuffle(st.deck);
  const loads=[];
  for(let i=0;i<7&&st.deck.length;i++){
    const id=st.deck.shift(),c=st.cards[id];
    c.zone="hand";c.faceDown=false;st.hand.push(id);loads.push(load(c));
  }
  await Promise.all(loads);
  $("#hand").classList.remove("open");
  render();
  toast("Shuffled · drew 7");
}

function untapAll(){
  let changed=0;
  st.field.forEach(id=>{if(st.cards[id].tap){st.cards[id].tap=false;changed++;}});
  render();
  toast(changed?`Untapped ${changed}`:"Everything already untapped");
}

function movePreviewTo(zone){
  if(!preview)return;
  putInZone(preview.id,zone,zone==="deck");
  if(zone==="hand")preview.faceDown=false;
  if(zone==="deck")preview.faceDown=true;
  $("#inspect").classList.remove("on");
  render();
}

document.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("[data-v]").forEach(x=>x.classList.remove("on"));
  b.classList.add("on");
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("on"));
  $("#"+b.dataset.v).classList.add("on");
  st.view=b.dataset.v;
  if(st.view==="opp")$("#hand").classList.remove("open");
});

document.querySelectorAll(".life-heart[data-life]").forEach(btn=>{
  let timer=null,last=0;
  btn.addEventListener("click",e=>{
    e.preventDefault();
    const k=btn.dataset.life,now=Date.now();
    if(now-last<330){
      clearTimeout(timer);
      last=0;
      st.life[k]++;
      renderLife();
      return;
    }
    last=now;
    timer=setTimeout(()=>{
      if(last===now){
        st.life[k]--;
        last=0;
        renderLife();
      }
    },330);
  });
  btn.addEventListener("contextmenu",e=>e.preventDefault());
});

$("#draw").onclick=drawOne;
$("#mulligan").onclick=mulligan;
$("#untap").onclick=untapAll;
$("#closehand").onclick=()=>$("#hand").classList.remove("open");
$("#import").onclick=()=>$("#imp").classList.add("on");
$("#cancel").onclick=()=>$("#imp").classList.remove("on");

$("#urlm").onclick=()=>{
  $("#urlm").classList.add("on");$("#listm").classList.remove("on");
  $("#urlp").classList.add("on");$("#listp").classList.remove("on");
};
$("#listm").onclick=()=>{
  $("#listm").classList.add("on");$("#urlm").classList.remove("on");
  $("#listp").classList.add("on");$("#urlp").classList.remove("on");
};
$("#run").onclick=async()=>{
  try{
    $("#msg").textContent="Importing…";
    $("#urlp").classList.contains("on")?await importDeck():applyDeck(parseList($("#list").value));
    $("#msg").textContent="Imported";
    setTimeout(()=>$("#imp").classList.remove("on"),600);
  }catch(e){$("#msg").textContent=e.message;}
};

$("#inspect").onclick=e=>{if(e.target===$("#inspect"))$("#inspect").classList.remove("on");};
$("#pimg").onclick=e=>e.stopPropagation();

$("#tap").onclick=()=>{
  if(!preview)return;
  preview.tap=!preview.tap;
  render();
  rerenderPreview();
};
$("#one").onclick=()=>{if(preview){preview.p1++;render();rerenderPreview();}};
$("#manual").onclick=()=>$("#xx").classList.toggle("on");
$("#apply").onclick=()=>{
  if(preview){
    preview.p=parseInt($("#px").value)||0;
    preview.t=parseInt($("#tx").value)||0;
    $("#xx").classList.remove("on");
    render();rerenderPreview();
  }
};
$("#flip").onclick=()=>{
  if(!preview)return;
  preview.faceDown=!preview.faceDown;
  rerenderPreview();
  render();
};
$("#state").onclick=()=>{
  if(!preview||!preview.isDoubleFaced)return;
  preview.stateIndex=(preview.stateIndex+1)%preview.faces.length;
  rerenderPreview();
  render();
};
$("#tohand").onclick=()=>movePreviewTo("hand");
$("#todiscard").onclick=()=>movePreviewTo("discard");
$("#toexile").onclick=()=>movePreviewTo("exile");

document.addEventListener("contextmenu",e=>{
  if(!e.target.closest("#imp"))e.preventDefault();
},{capture:true});
document.addEventListener("selectstart",e=>{
  if(!e.target.closest("#imp"))e.preventDefault();
},{capture:true});
document.addEventListener("dragstart",e=>e.preventDefault());

document.addEventListener("keydown",e=>{
  if(e.target&&/input|textarea/i.test(e.target.tagName))return;
  if(e.key==="h"||e.key==="H")$("#hand").classList.toggle("open");
  if(e.key==="d"||e.key==="D")drawOne();
  if(e.key==="u"||e.key==="U")untapAll();
  if(e.key==="Escape"){
    $("#inspect").classList.remove("on");
    $("#imp").classList.remove("on");
    $("#hand").classList.remove("open");
  }
});

["Shivan Dragon","Birds of Paradise","Counterspell"].forEach((n,i)=>{
  const id=make(n,"opp");
  st.cards[id].x=24+i*25;st.cards[id].y=20;st.opp.push(id);
  load(st.cards[id]).then(render);
});

render();
})();