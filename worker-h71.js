import h70 from './worker-h70.js';

const BUILD='H71';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

async function scryfallCollection(identifiers){
  if(!identifiers.length)return[];
  try{
    const r=await fetch('https://api.scryfall.com/cards/collection',{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json','user-agent':'MTGTabletop/1.0 (Cloudflare Worker)'},
      body:JSON.stringify({identifiers})
    });
    if(!r.ok)return[];
    const data=await r.json();
    return Array.isArray(data.data)?data.data:[];
  }catch{return[]}
}

async function inBatches(items,size,fn){
  const out=[];
  for(let i=0;i<items.length;i+=size)out.push(...await fn(items.slice(i,i+size)));
  return out;
}

function semanticTokenKey(card){
  if(card?.oracle_id)return`oracle:${card.oracle_id}`;
  const colors=Array.isArray(card?.colors)?card.colors.join(''):'';
  return[
    String(card?.name||'').toLowerCase(),
    String(card?.type_line||'').toLowerCase(),
    String(card?.oracle_text||'').toLowerCase(),
    String(card?.power??''),String(card?.toughness??''),String(card?.loyalty??''),colors
  ].join('|');
}

async function discoverWholeDeckTokens(deck){
  const sourceNames=[];
  const seenSources=new Set();
  for(const item of[...(deck.commander||[]),...(deck.deck||[])]){
    const name=String(item?.name||'').trim();
    const key=name.toLowerCase();
    if(!name||seenSources.has(key))continue;
    seenSources.add(key);sourceNames.push(name);
  }

  const sourceCards=await inBatches(sourceNames,75,batch=>scryfallCollection(batch.map(name=>({name}))));
  const related=new Map();
  for(const card of sourceCards){
    for(const part of(card?.all_parts||[])){
      const component=String(part?.component||'').toLowerCase();
      const type=String(part?.type_line||'').toLowerCase();
      if(component!=='token'&&!type.startsWith('token ')&&type!=='emblem')continue;
      if(part?.id&&!related.has(part.id))related.set(part.id,part);
    }
  }

  const tokenCards=await inBatches([...related.keys()],75,batch=>scryfallCollection(batch.map(id=>({id}))));
  const discovered=[];
  const semanticSeen=new Set();
  for(const card of tokenCards){
    const key=semanticTokenKey(card);
    if(!key||semanticSeen.has(key))continue;
    semanticSeen.add(key);
    discovered.push({name:card.name||'Token',quantity:1,...(card.id?{scryfallId:card.id}:{}),token:true});
  }

  // Keep an explicitly supplied Archidekt token only when the whole-deck scan
  // did not already find a token with that name. This preserves unusual/manual
  // token entries without duplicating ordinary generated tokens.
  const names=new Set(discovered.map(x=>String(x.name||'').toLowerCase()));
  for(const item of(deck.tokens||[])){
    const name=String(item?.name||'').toLowerCase();
    if(!name||names.has(name))continue;
    names.add(name);discovered.push({...item,quantity:1,token:true});
  }
  return discovered;
}

async function importWithCompleteTokens(request,env,ctx){
  const base=await h70.fetch(request,env,ctx);
  if(!base.ok)return base;
  let deck;
  try{deck=await base.clone().json()}catch{return base}
  if(!deck||typeof deck!=='object')return base;
  const tokens=await discoverWholeDeckTokens(deck);
  // If Scryfall is temporarily unavailable, keep the existing import result
  // rather than replacing a non-empty token list with nothing.
  if(tokens.length)deck.tokens=tokens;
  return new Response(JSON.stringify(deck),{status:base.status,headers:headers('application/json; charset=utf-8')});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    if(url.pathname==='/api/import-archidekt'&&request.method==='POST')return importWithCompleteTokens(request,env,ctx);

    const response=await h70.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      const out=text.replaceAll('H70','H71').replaceAll('h70-','h71-');
      return new Response(out,{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
