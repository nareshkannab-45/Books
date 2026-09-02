import { runEtl } from "./etl.js";
let pending=null;
export function processXeroContactWebhook(){if(pending)return pending;pending=new Promise(resolve=>setTimeout(async()=>{try{resolve(await runEtl({reason:"xero-webhook",contactType:"ALL"}));}catch(e){console.error("Webhook ETL failed:",e?.stack||e);resolve({success:false,error:e.message});}finally{pending=null;}},1500));return pending;}
