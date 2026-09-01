import h79 from './worker-h79.js';
import h70 from './worker-h70.js';

const BUILD='H81';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

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

function oracleText(card){
  return [card?.oracle_text,...(card?.card_faces||[]).map(f=>f?.oracle_text)].filter(Boolean).join('\n');
}

function createsToken(card){
  const text=oracleText(card).toLowerCase();
  return /\bcreat(?:e|es|ed|ing)\b/.test(text)&&/\btokens?\b/.test(text);
}

function semanticTokenKey(card){
  const colors=Array.isArray(card?.colors)?[...card.colors].sort().join(''):'';
  return [
    String(card?.name||'').trim().toLowerCase(),
    String(card?.type_line||'').trim().toLowerCase(),
    String(card?.oracle_text||'').trim().toLowerCase(),
    String(card?.power??''),String(card?.toughness??''),String(card?.loyalty??''),colors
  ].join('|');
}

async function discoverCreatedTokens(deck){
  const names=[];
  const seenNames=new Set();
  for(const item of[...(deck?.commander||[]),...(deck?.deck||[])]){
    const name=String(item?.name||'').trim(),key=name.toLowerCase();
    if(name&&!seenNames.has(key)){seenNames.add(key);names.push(name)}
  }

  const sourceCards=await scryfallCollection(names.map(name=>({name})));
  const relatedIds=[];
  const seenIds=new Set();
  for(const card of sourceCards){
    if(!createsToken(card))continue;
    for(const part of(card?.all_parts||[])){
      const component=String(part?.component||'').toLowerCase();
      const type=String(part?.type_line||'').toLowerCase();
      if(component!=='token'&&!type.startsWith('token ')&&type!=='emblem')continue;
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

async function importWithCreatedTokens(request,env,ctx){
  const base=await h70.fetch(request,env,ctx);
  if(!base.ok)return base;
  let deck;
  try{deck=await base.clone().json()}catch{return base}
  try{
    const tokens=await discoverCreatedTokens(deck);
    if(tokens.length)deck.tokens=tokens;
  }catch{}
  return new Response(JSON.stringify(deck),{status:base.status,headers:headers('application/json; charset=utf-8')});
}

function transformApp(source){
  return source.replace(
`    if(!wasMoved){
      if(from==='deck'){openDeckOptions();return}
      requestAnimationFrame(()=>openBoardZoom(c));
      return;
    }`,
`    if(!wasMoved){
      if(from==='deck'){openDeckOptions();return}
      if(from==='tokens'){
        const now=Date.now(),key='tokenpile_'+id,prev=lastTap[key]||0;
        if(now-prev<340){
          clearTimeout(lastTap[key+'_timer']);delete lastTap[key+'_timer'];lastTap[key]=0;
          requestAnimationFrame(()=>openBoardZoom(c));
        }else{
          lastTap[key]=now;
          lastTap[key+'_timer']=setTimeout(()=>{if(lastTap[key]===now){lastTap[key]=0;delete lastTap[key+'_timer']}},340);
        }
        return;
      }
      requestAnimationFrame(()=>openBoardZoom(c));
      return;
    }`
  );
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});
    if(url.pathname==='/api/import-archidekt'&&request.method==='POST')return importWithCreatedTokens(request,env,ctx);

    const response=await h79.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H79','H81').replaceAll('h79-','h81-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
