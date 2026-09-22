/**
 * WebRTC signaling for the two-person Spade room.
 * Redis is the short-lived mailbox for offer/answer/ICE and room diagnostics.
 */
import { z } from "zod";
import { redisCommand } from "./redis.server";
import type { RtcPollResponse, SignalRow } from "./p2p";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({ op:z.literal("signal"), room:ID, from:ID, to:ID, kind:z.enum(["offer","answer","ice"]), payload:z.unknown().refine(v=>v!==undefined&&JSON.stringify(v).length<=32768) });
const leaveSchema = z.object({ op:z.literal("leave"), room:ID, peer:ID });
const traceSchema = z.object({ op:z.literal("trace"), room:ID, peer:ID, role:z.enum(["guest","operator"]), line:z.string().min(1).max(500) });
const postSchema = z.discriminatedUnion("op",[signalSchema,leaveSchema,traceSchema]);
const SIGNAL_TTL_SECONDS=120;
const TRACE_TTL_SECONDS=1800;

function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
function inbox(room:string,peer:string){return `spade:rtc:${room}:${peer}:inbox`}
function signalKey(room:string,id:number){return `spade:rtc:${room}:signal:${id}`}
function seqKey(room:string){return `spade:rtc:${room}:seq`}
function traceKey(room:string){return `spade:rtc:${room}:trace`}

async function handleGet(url:URL):Promise<Response>{
  if(url.searchParams.get("op")==="trace"){
    const parsed=z.object({room:ID}).safeParse({room:url.searchParams.get("room")});
    if(!parsed.success)return json({error:"invalid room"},400);
    const raw=await redisCommand(["LRANGE",traceKey(parsed.data.room),0,199]);
    const lines=Array.isArray(raw)?raw.filter((v):v is string=>typeof v==="string"):[];
    return json({room:parsed.data.room,lines});
  }
  const parsed=z.object({room:ID,peer:ID,since:z.coerce.number().int().min(0).default(0)}).safeParse({room:url.searchParams.get("room"),peer:url.searchParams.get("peer"),since:url.searchParams.get("since")??0});
  if(!parsed.success)return json({error:"invalid query",detail:parsed.error.issues},400);
  const {room,peer,since}=parsed.data;
  const idsRaw=await redisCommand(["ZRANGEBYSCORE",inbox(room,peer),`(${since}`,"+inf","LIMIT",0,200]);
  const ids=Array.isArray(idsRaw)?idsRaw.filter((v):v is string=>typeof v==="string"):[];
  const signals:SignalRow[]=[];
  if(ids.length){
    const valuesRaw=await redisCommand(["MGET",...ids.map(id=>signalKey(room,Number(id)))]);
    const values=Array.isArray(valuesRaw)?valuesRaw:[];
    for(const value of values){if(typeof value!=="string")continue;try{signals.push(JSON.parse(value) as SignalRow)}catch{/* ignore */}}
  }
  const body:RtcPollResponse={peers:[],signals};return json(body);
}

async function handlePost(request:Request):Promise<Response>{
  let body:unknown;try{body=await request.json()}catch{return json({error:"invalid JSON"},400)}
  const parsed=postSchema.safeParse(body);if(!parsed.success)return json({error:"invalid request",detail:parsed.error.issues},400);
  const msg=parsed.data;
  if(msg.op==="leave")return json({ok:true});
  if(msg.op==="trace"){
    const entry=`${new Date().toISOString()} [${msg.role}:${msg.peer}] ${msg.line}`;
    const key=traceKey(msg.room);
    await redisCommand(["RPUSH",key,entry]);
    await redisCommand(["LTRIM",key,-200,-1]);
    await redisCommand(["EXPIRE",key,TRACE_TTL_SECONDS]);
    return json({ok:true});
  }
  const nextIdRaw=await redisCommand(["INCR",seqKey(msg.room)]);if(typeof nextIdRaw!=="number")throw new Error("Redis did not return a signal id");
  const id=nextIdRaw;const stored:SignalRow={id,from:msg.from,kind:msg.kind,payload:msg.payload};const key=signalKey(msg.room,id);const box=inbox(msg.room,msg.to);
  await redisCommand(["SET",key,JSON.stringify(stored),"EX",SIGNAL_TTL_SECONDS]);
  await redisCommand(["ZADD",box,id,id]);await redisCommand(["EXPIRE",box,SIGNAL_TTL_SECONDS]);await redisCommand(["EXPIRE",seqKey(msg.room),SIGNAL_TTL_SECONDS*2]);
  return json({ok:true,id});
}
export async function handleSignaling(request:Request):Promise<Response>{try{if(request.method==="GET")return await handleGet(new URL(request.url));if(request.method==="POST")return await handlePost(request);return json({error:"method not allowed"},405)}catch(error){const message=error instanceof Error?error.message:String(error);console.error("[rtc] Redis signaling error:",error);return json({error:"signaling failed",detail:message},500)}}
