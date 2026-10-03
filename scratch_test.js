const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length > 1) {
        let val = parts.slice(1).join('=').trim();
        if (val.startsWith('"')) val = val.substring(1, val.length - 1);
        acc[parts[0]] = val;
    }
    return acc;
}, {});

const headers = { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + env.NEXT_PUBLIC_SUPABASE_ANON_KEY };

async function checkTable(table) {
    const url = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + table + '?select=*&limit=1';
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log(`Table ${table} status: ${res.status} response: ${text}`);
}

(async () => {
    await checkTable('assessors');
    await checkTable('assessor_aspect_mapping');
    await checkTable('aspect_descriptions');
    await checkTable('outlets');
})();
