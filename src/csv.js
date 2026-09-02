const clean=v=>v==null?"":String(v).replace(/\r?\n/g," ").trim();
const esc=v=>{const s=clean(v);return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
export function contactsToRows(cs){
    return cs.map(c=>{
        const a=(c.Addresses||[]).find(x=>x.AddressType==="STREET")||(c.Addresses||[])[0]||{};
        const p=(c.Phones||[]).find(x=>x.PhoneType==="DEFAULT")||(c.Phones||[])[0]||{};
        const cp=(c.ContactPersons||[])[0]||{};
        return {
            XeroContactID:clean(c.ContactID),
            ContactName:clean(c.Name),
            ContactType:c.IsSupplier&&!c.IsCustomer?"vendor":"customer",
            FirstName:clean(c.FirstName||cp.FirstName),
            LastName:clean(c.LastName||cp.LastName),
            Email:clean(c.EmailAddress||cp.EmailAddress),
            Phone:clean(p.PhoneNumber||cp.Phone),
            Street:clean(a.AddressLine1),
            City:clean(a.City),
            State:clean(a.Region),
            PostalCode:clean(a.PostalCode),
            Country:clean(a.Country)
        };
    });
}

export function rowsToCsv(rows){
    const h=["XeroContactID",
        "ContactName",
        "ContactType",
        "FirstName",
        "LastName",
        "Email",
        "Phone",
        "Street",
        "City",
        "State",
        "PostalCode",
        "Country"];
        return [h.join(","),...rows.map(r=>h.map(k=>esc(r[k])).join(","))].join("\n")+"\n";
}
