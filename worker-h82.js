import h81 from './worker-h81.js';

const BUILD='H82';

function headers(contentType){return{'content-type':contentType,'cache-control':'no-store, max-age=0, must-revalidate','pragma':'no-cache','expires':'0','x-mtg-build':BUILD}}

function transformApp(source){
  let out=source;

  out=out.replace(
    "const preload=[...st.cmd.slice(0,2),st.tokens[0]].filter(Boolean);\n  await Promise.all(preload.map(id=>load(st.cards[id])));",
    "const preload=[...st.cmd.slice(0,2),...st.tokens].filter(Boolean);\n  await Promise.all(preload.map(id=>load(st.cards[id])));"
  );

  out=out.replace(
    "await Promise.all([...st.hand,...st.cmd.slice(0,2),st.tokens[0]].filter(Boolean).map(id=>load(st.cards[id])));",
    "await Promise.all([...st.hand,...st.cmd.slice(0,2),...st.tokens].filter(Boolean).map(id=>load(st.cards[id])));"
  );

  return out;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return new Response(JSON.stringify({ok:true,build:BUILD}),{status:200,headers:headers('application/json; charset=utf-8')});

    const response=await h81.fetch(request,env,ctx);
    if(url.pathname==='/app.js'){
      const text=await response.text();
      return new Response(transformApp(text),{status:response.status,headers:headers('application/javascript; charset=utf-8')});
    }
    if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/game'||url.pathname==='/game.html'||url.pathname==='/api/html-test'){
      const text=await response.text();
      return new Response(text.replaceAll('H81','H82').replaceAll('h81-','h82-'),{status:response.status,headers:headers(response.headers.get('content-type')||'text/html; charset=utf-8')});
    }
    return response;
  }
};
