import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";
const ALG="aes-256-gcm";
async function ensureDir(){await fs.mkdir(path.dirname(config.tokenFile),{recursive:true});}
function key(){const s=process.env.TOKEN_ENCRYPTION_KEY;if(!s||s.length<32)throw new Error("TOKEN_ENCRYPTION_KEY must be at least 32 characters.");return crypto.createHash("sha256").update(s).digest();}
function encrypt(v){const iv=crypto.randomBytes(12),c=crypto.createCipheriv(ALG,key(),iv);const data=Buffer.concat([c.update(JSON.stringify(v),"utf8"),c.final()]);return JSON.stringify({iv:iv.toString("base64"),tag:c.getAuthTag().toString("base64"),data:data.toString("base64")});}
function decrypt(t){const x=JSON.parse(t),d=crypto.createDecipheriv(ALG,key(),Buffer.from(x.iv,"base64"));d.setAuthTag(Buffer.from(x.tag,"base64"));return JSON.parse(Buffer.concat([d.update(Buffer.from(x.data,"base64")),d.final()]).toString("utf8"));}
async function readAll(){await ensureDir();try{return decrypt(await fs.readFile(config.tokenFile,"utf8"));}catch(e){if(e.code==="ENOENT")return{};throw e;}}
async function writeAll(v){await ensureDir();const tmp=config.tokenFile+".tmp";await fs.writeFile(tmp,encrypt(v),{encoding:"utf8",mode:0o600});await fs.rename(tmp,config.tokenFile);}
export async function getProviderToken(p){return (await readAll())[p]||null;}
export async function saveProviderToken(p,t){const a=await readAll();a[p]={...(a[p]||{}),...t,updatedAt:new Date().toISOString()};await writeAll(a);return a[p];}
export async function clearProviderToken(p){const a=await readAll();delete a[p];await writeAll(a);}
const locks = new Map();
export async function withProviderLock(name, fn) {
  const previous = locks.get(name) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(name, queued);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(name) === queued) locks.delete(name);
  }
}
