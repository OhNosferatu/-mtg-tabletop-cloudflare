import h79 from './worker-h79.js';
import h70 from './worker-h70.js';

const BUILD='H80';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function archidektId(value){
  const raw=String(value||'').trim();
  try{const u=new URL(raw),m=u.pathname.match(/\/decks\/(\d+)/);if(m)return m[1]}catch{}
  const m=raw.match(/(?:archidekt\.com\/decks\/)?(\d+)/i);
  return m?m[1]:null;
}

function categoryNames(entry,byId){
  return(entry?.categories||[]).map(c=>{
    if(typeof c==='string')return c;
    if(typeof c==='number')return byId.get(String(c))?.name||'';
    if(c&&typeof c==='object')return c.name||byId.get(String(c.id))?.name||'';
    return'';
  }).filter(Boolean);
}

async function scryfallCollection(identifiers){
  const out=[];
  for(let i=0;i<identifiers.length;i+=75){
    try{
      const r=await fetch('https://api.scryfall.com/cards/collection',{
        method:'POST',
        headers:{'content-type':'application/json','accept':'application/json','user-agent':'MTGTabletop/1.0 (Cloudflare Worker)'},
        body:JSON.stringify({identifiers:identifiers.slice(i,i+75)})
      });
      if(r.ok){const d=await r.json();if(Array.isArray(d.data))out.push(...d.data)}
    }catch{}
  }
  return out;
}

function semanticTokenKey(card){
  const colors=Array.isArray(card?.colors)?[...card.colors].sort().join(''):'';
  return[
    String(card?.name||'').trim().toLowerCase(),
    String(card?.type_line||'').trim().toLowerCase(),
    String(card?.oracle_text||'').trim().toLowerCase(),
    String(card?.power??''),String(card?.toughness??''),String(card?.loyalty??''),colors
  ].join('|');
}

async function categoryTokenSet(rawDeck){
  const categories=Array.isArray(rawDeck?.categories)?rawDeck.categories:[];
  const byId=new Map(categories.map(c=>[String(c.id),c]));
  const sourceNames=[];
  const seenSources=new Set();

  for(const entry of(rawDeck?.cards||[])){
    const names=categoryNames(entry,byId).map(x=>String(x).trim().toLowerCase());
    if(!names.some(x=>x==='token'||x==='tokens'))continue;
    const card=entry?.card||{},oracle=card.oracleCard||{};
    const typeLine=String(oracle.typeLine||oracle.type_line||card.typeLine||card.type_line||'');
    if(/^token\b/i.test(typeLine))continue;
    const name=String(oracle.name||card.name||entry.name||'').trim();
    const key=name.toLowerCase();
    if(name&&!seenSources.has(key)){seenSources.add(key);sourceNames.push(name)}
  }

  if(!sourceNames.length)return[];
  const sourceCards=await scryfallCollection(sourceNames.map(name=>({name})));
  const relatedIds=[];
  const seenIds=new Set();
  for(const card of sourceCards){
    for(const part of(card?.all_parts||[])){
      const component=String(part?.component||'').toLowerCase();
      const type=String(part?.type_line||'').toLowerCase();
      if(component!=='token'&&!type.startsWith('token '))continue;
      const id=String(part?.id||'');
      if(id&&!seenIds.has(id)){seenIds.add(id);relatedIds.push(id)}
    }
  }

  const tokenCards=await scryfallCollection(relatedIds.map(id=>({id})));
  const result=[];
  const semanticSeen=new Set();
  for(const card of tokenCards){
    const key=semanticTokenKey(card);
    if(!key||semanticSeen.has(key))continue;
    semanticSeen.add(key);
    result.push({name:card.name||'Token',quantity:1,...(card.id?{scryfallId:card.id}:{}),token:true});
  }
  return result;
}

async function importArchidektWithCategoryTokens(request,env,ctx){
  let input;
  try{input=await request.clone().json()}catch{return h70.fetch(request,env,ctx)}
  const id=archidektId(input?.url);
  if(!id)return h70.fetch(request,env,ctx);

  const baseResponse=await h70.fetch(request,env,ctx);
  if(!baseResponse.ok)return baseResponse;
  let deck;
  try{deck=await baseResponse.clone().json()}catch{return baseResponse}

  try{
    const rawResponse=await fetch(`https://archidekt.com/api/decks/${encodeURIComponent(id)}/`,{headers:{accept:'application/json','user-agent':'MTGTabletop/1.0'}});
    if(!rawResponse.ok)return baseResponse;
    const rawDeck=await rawResponse.json();
    const tokens=await categoryTokenSet(rawDeck);
    if(tokens.length)deck.tokens=tokens;
  }catch{return baseResponse}

  return new Response(JSON.stringify(deck),{status:200,headers:headers('application/json; charset=utf-8')});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    if(url.pathname==='/api/import-archidekt'&&request.method==='POST')return importArchidektWithCategoryTokens(request,env,ctx);

    const response=await h79.fetch(request,env,ctx);
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H79','H80').replaceAll('h79-','h80-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
