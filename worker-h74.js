import h73 from './worker-h73.js';

const BUILD='H74';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

async function scryfallCollection(ids){
  if(!ids.length)return[];
  const out=[];
  for(let i=0;i<ids.length;i+=75){
    const batch=ids.slice(i,i+75);
    try{
      const r=await fetch('https://api.scryfall.com/cards/collection',{
        method:'POST',
        headers:{'content-type':'application/json','accept':'application/json','user-agent':'MTGTabletop/1.0 (Cloudflare Worker)'},
        body:JSON.stringify({identifiers:batch.map(id=>({id}))})
      });
      if(r.ok){const d=await r.json();if(Array.isArray(d.data))out.push(...d.data)}
    }catch{}
  }
  return out;
}

async function hydrateTokenImport(request,env,ctx){
  const base=await h73.fetch(request,env,ctx);
  if(!base.ok)return base;
  let deck;
  try{deck=await base.clone().json()}catch{return base}
  if(!deck||!Array.isArray(deck.tokens)||!deck.tokens.length)return base;

  const ids=[...new Set(deck.tokens.map(t=>String(t?.scryfallId||'')).filter(id=>/^[0-9a-f-]{36}$/i.test(id)))];
  const cards=await scryfallCollection(ids);
  const byId=new Map(cards.map(c=>[c.id,c]));

  deck.tokens=deck.tokens.map(token=>{
    const card=byId.get(String(token?.scryfallId||''));
    if(!card)return token;
    const faces=(card.card_faces||[]).map(f=>({name:f.name||card.name||token.name,image:f.image_uris?.normal||''})).filter(f=>f.image);
    const image=card.image_uris?.normal||faces[0]?.image||'';
    const doubleFacedLayouts=new Set(['transform','modal_dfc','double_faced_token','reversible_card']);
    return {...token,image,faces:faces.length?faces:[{name:card.name||token.name,image}],isDoubleFaced:doubleFacedLayouts.has(card.layout)&&faces.length>1};
  });

  return new Response(JSON.stringify(deck),{status:base.status,headers:headers('application/json; charset=utf-8')});
}

function transformApp(source){
  let out=source;
  out=out.replace(
    "function expand(items,z){const out=[];(items||[]).forEach(x=>{const q=typeof x==='string'?1:+x.quantity||1,n=typeof x==='string'?x:x.name;for(let i=0;i<q;i++)out.push(make(n,z,typeof x==='string'?{}:x))});return out}",
    "function expand(items,z){const out=[];(items||[]).forEach(x=>{const q=typeof x==='string'?1:+x.quantity||1,n=typeof x==='string'?x:x.name;for(let i=0;i<q;i++){const id=make(n,z,typeof x==='string'?{}:x),c=st.cards[id];if(x&&typeof x==='object'&&x.image){c.img=x.image;c.faces=Array.isArray(x.faces)&&x.faces.length?x.faces:[{name:n,image:x.image}];c.isDoubleFaced=!!x.isDoubleFaced&&c.faces.length>1}out.push(id)}});return out}"
  );
  out=out.replace(
    "[...st.cmd.slice(0,2),st.side[0],...st.tokens.slice(0,4)].filter(Boolean).forEach(id=>load(st.cards[id]).then(render));render()",
    "[...st.cmd.slice(0,2),st.side[0]].filter(Boolean).forEach(id=>load(st.cards[id]).then(render));render()"
  );
  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    if(url.pathname==='/api/import-archidekt'&&request.method==='POST')return hydrateTokenImport(request,env,ctx);

    const response=await h73.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H73','H74').replaceAll('h73-','h74-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
