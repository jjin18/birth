import { genericFortuneIds,jokeFortuneIds,fortunePoolSize } from '../lib/fortunes';
const candidates=[...genericFortuneIds.map(id=>`(${id},'generic')`),...jokeFortuneIds.map(id=>`(${id},'joke')`)].join(',');
type Row = { id: number; opened_at: string };
type Statement = { bind(...values: unknown[]): Statement; all<T>(): Promise<{results:T[]}> };
type Env = {
 DB: {prepare(sql:string):Statement;batch<T>(statements:Statement[]):Promise<{results:T[]}[]>};
 ASSETS: {fetch(request:Request):Promise<Response>};
 LOCAL_PREVIEW?: string;
 PUBLIC_ACCESS?: 'shared';
};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const publicOrigin='https://penthouse-22.rocky-owl-3221.chatgpt.site';
export default {
 async fetch(request:Request,env:Env):Promise<Response> {
  const url=new URL(request.url);
  if(url.pathname.replace(/\/$/,'')!=='/api/fortunes')return env.ASSETS.fetch(request);
  const local=env.LOCAL_PREVIEW==='1'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  // Public hosting has one shared collection, not a spoofable platform identity.
  // The existing Sites deployment stays private unless explicitly configured.
  const publicAccess=env.PUBLIC_ACCESS==='shared';
  const user=publicAccess?'public-room':request.headers.get('oai-authenticated-user-id')||(local?'local-preview':null);
  if(!user)return json({error:'Please sign in to this private site to open your shared fortunes.'},401);
  if(!env.DB)return json({error:'The shared paper clip is temporarily unavailable. Please try again.'},503);
  try {
   if(request.method==='GET') {
    const {results}=await env.DB.prepare('SELECT id, opened_at FROM opened_fortunes ORDER BY opened_at DESC, id DESC').all<Row>();
    return json({fortunes:results.map(row=>({id:row.id,openedAt:row.opened_at})),total:fortunePoolSize});
   }
   if(request.method!=='POST')return json({error:'Method not allowed.'},405);
   const origin=request.headers.get('Origin');
   const allowedOrigin=origin===url.origin||(!publicAccess&&origin===publicOrigin);
   if((origin&&!allowedOrigin)||(publicAccess&&!origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Open the cookie from the apartment.'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected JSON.'},415);
   if(Number(request.headers.get('Content-Length')||0)>512)return json({error:'Request too large.'},413);
   const raw=await request.text();
   if(raw.length>512)return json({error:'Request too large.'},413);
   let body:{requestId?:unknown;kind?:unknown};try{body=JSON.parse(raw)}catch{return json({error:'Invalid request.'},400)}
   if(!body||typeof body.requestId!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(body.requestId))return json({error:'A unique opening ID is required.'},400);
   if(body.kind!==undefined&&body.kind!=='generic'&&body.kind!=='joke')return json({error:'Invalid fortune kind.'},400);
   // One transactional batch reserves an unused ID and clips it immediately.
   // The unique request ID also makes retries/Strict Mode mounts idempotent.
   const now=new Date().toISOString();
   const result=await env.DB.batch<Row>([
    env.DB.prepare(`WITH candidates(id,kind) AS (VALUES ${candidates})
     INSERT OR IGNORE INTO opened_fortunes (id,request_id,opened_by,opened_at)
     SELECT id,?,?,? FROM candidates
     WHERE NOT EXISTS (SELECT 1 FROM opened_fortunes f WHERE f.id=candidates.id)
     ORDER BY CASE WHEN kind=? THEN 0 ELSE 1 END,random() LIMIT 1`).bind(body.requestId,user,now,body.kind||'generic'),
    env.DB.prepare('SELECT id, opened_at FROM opened_fortunes WHERE request_id=? AND opened_by=?').bind(body.requestId,user),
   ]);
   const row=result[1].results[0];
   if(!row)return json({exhausted:true,total:fortunePoolSize},200);
   return json({fortune:{id:row.id,openedAt:row.opened_at},total:fortunePoolSize});
  }catch(error){console.error('Fortune storage failed:',error);return json({error:'Your cookie could not be saved. Please retry; the same opening will never use two fortunes.'},503)}
 }
};
