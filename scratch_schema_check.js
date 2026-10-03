const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t && !t.startsWith('#')) {
    const i = t.indexOf('=');
    if (i > 0) {
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[t.slice(0, i).trim()] = v;
    }
  }
});
const sb = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  // 1. Check assessments table constraints via RPC (raw SQL)
  const { data: cols, error: colErr } = await sb.rpc('exec_sql', {
    query: `SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'assessments' ORDER BY ordinal_position`
  });
  
  if (colErr) {
    // rpc might not exist, try alternative
    console.log('RPC not available, trying alternative check...');
    
    // Try inserting with null assessor_id
    const { data: crew } = await sb.from('crew').select('id').limit(1);
    const { data: period } = await sb.from('assessment_periods').select('id').eq('is_active', true).single();
    
    if (!crew || !period) { console.log('FAIL: No crew or period'); return; }
    
    // Test 1: null assessor_id
    const { data: r1, error: e1 } = await sb.from('assessments').insert({
      period_id: period.id,
      assessor_id: null,
      assessed_id: crew[0].id,
      scores: { test: 1 },
    }).select();
    console.log('Test NULL assessor_id:', e1 ? 'REJECTED: ' + e1.message : 'ACCEPTED (id=' + r1[0].id + ')');
    if (r1) await sb.from('assessments').delete().eq('id', r1[0].id);

    // Test 2: omit assessor_id entirely 
    const { data: r2, error: e2 } = await sb.from('assessments').insert({
      period_id: period.id,
      assessed_id: crew[0].id,
      scores: { test: 1 },
    }).select();
    console.log('Test OMIT assessor_id:', e2 ? 'REJECTED: ' + e2.message : 'ACCEPTED (id=' + r2[0].id + ')');
    if (r2) await sb.from('assessments').delete().eq('id', r2[0].id);

    // Test 3: FK constraints listing
    const { data: fks, error: fkErr } = await sb.from('assessments').select('*').limit(0);
    console.log('Table accessible:', !fkErr);

    // Test 4: Check if assessors table IDs work
    const { data: assessor } = await sb.from('assessors').select('id, code').eq('code', 'expa').single();
    if (assessor) {
      const { data: r3, error: e3 } = await sb.from('assessments').insert({
        period_id: period.id,
        assessor_id: assessor.id,
        assessed_id: crew[0].id,
        scores: { test: 1 },
      }).select();
      console.log('Test ASSESSOR ID (expa):', e3 ? 'REJECTED: ' + e3.message : 'ACCEPTED (id=' + r3[0].id + ')');
      if (r3) await sb.from('assessments').delete().eq('id', r3[0].id);
    }
  } else {
    console.log('Columns:', JSON.stringify(cols, null, 2));
  }
}

main().catch(console.error);
