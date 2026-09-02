import { config } from "./config.js";
import { getXeroAccessToken } from "./oauth.js";
import { getProviderToken, saveProviderToken } from "./tokenStore.js";

export async function discoverXeroTenants() {
  const token = await getXeroAccessToken();
  const r = await fetch("https://api.xero.com/connections", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Xero connections failed: ${JSON.stringify(d)}`);
  return d;
}

export async function selectXeroTenant(id) {
  const token = await getProviderToken("xero");
  const tenants = await discoverXeroTenants();
  const x = tenants.find(t => String(t.tenantId) === String(id));
  if (!x) throw new Error("Selected Xero tenant is not connected.");
  await saveProviderToken("xero", {
    tenantId: x.tenantId,
    tenantName: x.tenantName,
    tenantType: x.tenantType
  });
  return x;
}

export async function fetchXeroContacts(type = "ALL") {
  const t = await getProviderToken("xero");
  if (!t?.tenantId) throw new Error("Select a Xero tenant first.");
  const accessToken = await getXeroAccessToken();
  const contacts = [];
  let page = 1;

  while (true) {
    const r = await fetch(`${config.xero.apiUrl}/Contacts?page=${page}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "xero-tenant-id": t.tenantId
      }
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`Xero Contacts failed: ${JSON.stringify(d)}`);
    const batch = Array.isArray(d.Contacts) ? d.Contacts : [];
    contacts.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  if (type === "CUSTOMER") return contacts.filter(x => x.IsCustomer === true);
  if (type === "SUPPLIER") return contacts.filter(x => x.IsSupplier === true);
  return contacts;
}
