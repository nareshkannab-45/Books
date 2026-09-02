import "dotenv/config";
import path from "node:path";
import { 
    fileURLToPath 
} from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const env=(n,f="")=>process.env[n]??f;

for(const n of ["XERO_CLIENT_ID","XERO_CLIENT_SECRET","ZOHO_CLIENT_ID","ZOHO_CLIENT_SECRET","TOKEN_ENCRYPTION_KEY"]) 
    if(!env(n)) console.warn(`[config] Missing ${n}.`);
if(env("TOKEN_ENCRYPTION_KEY").length<32) console.warn("[config] TOKEN_ENCRYPTION_KEY should be at least 32 characters.");
export const config={
 port:Number(env("PORT","3000")), tokenFile:path.resolve(__dirname,"../data/tokens.enc"),
 skipExisting:env("SKIP_EXISTING","true").toLowerCase()==="true", contactType:env("CONTACT_TYPE","ALL").toUpperCase(),
 scheduleSecret:env("SCHEDULE_SECRET"),
 xero:{clientId:env("XERO_CLIENT_ID"),clientSecret:env("XERO_CLIENT_SECRET"),redirectUri:env("XERO_REDIRECT_URI","http://localhost:3000/auth/xero/callback"),authorizeUrl:env("XERO_AUTHORIZE_URL","https://login.xero.com/identity/connect/authorize"),tokenUrl:env("XERO_TOKEN_URL","https://identity.xero.com/connect/token"),apiUrl:env("XERO_API_URL","https://api.xero.com/api.xro/2.0"),webhookKey:env("XERO_WEBHOOK_KEY")},
 zoho:{clientId:env("ZOHO_CLIENT_ID"),clientSecret:env("ZOHO_CLIENT_SECRET"),redirectUri:env("ZOHO_REDIRECT_URI","http://localhost:3000/auth/zoho/callback"),accountsUrl:env("ZOHO_ACCOUNTS_URL","https://accounts.zoho.in"),apiDomain:env("ZOHO_API_DOMAIN","https://www.zohoapis.in")}
};
