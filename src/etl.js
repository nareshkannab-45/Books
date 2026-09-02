import { config } from "./config.js";
import { getProviderToken } from "./tokenStore.js";
import { fetchXeroContacts } from "./xero.js";
import { importContactsToZoho } from "./zoho.js";
import { contactsToRows,rowsToCsv } from "./csv.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
let running=null,lastRun=null;const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),dir=path.join(root,"data","exports");
export const getLastRun=()=>lastRun;
export async function runEtl({reason="manual",contactType=config.contactType}={}){if(running)return running;running=(async()=>{const startedAt=new Date().toISOString(),x=await getProviderToken("xero"),z=await getProviderToken("zoho");if(!x?.refreshToken||!x?.tenantId)throw new Error("Connect Xero and select a tenant first.");if(!z?.refreshToken||!z?.organizationId)throw new Error("Connect Zoho and select an organization first.");console.log(`ETL START (${reason})`);const contacts=await fetchXeroContacts(contactType),rows=contactsToRows(contacts),csv=rowsToCsv(rows);await fs.mkdir(dir,{recursive:true});const filename=`xero-contacts-${Date.now()}.csv`;await fs.writeFile(path.join(dir,filename),csv);const imp=await importContactsToZoho(z.organizationId,contacts,{skipExisting:config.skipExisting});const result={success:imp.failed===0,reason,source:{provider:"Xero",tenantId:x.tenantId,tenantName:x.tenantName||null,contactType},target:{provider:"Zoho Books",organizationId:z.organizationId,organizationName:z.organizationName||null},csv:{filename,rows:rows.length,bytes:Buffer.byteLength(csv)},exported:contacts.length,imported:imp.imported,skippedExisting:imp.skipped,failed:imp.failed,details:imp.results,startedAt,completedAt:new Date().toISOString()};lastRun=result;console.log(`ETL COMPLETE imported=${imp.imported} skipped=${imp.skipped} failed=${imp.failed}`);return result})();try{return await running}finally{running=null;}}
