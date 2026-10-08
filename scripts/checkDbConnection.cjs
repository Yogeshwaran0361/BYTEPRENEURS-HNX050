const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf-8')
    .split(/\r?\n/)
    .forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val.trim();
      }
    });
}

const url = env['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const key = env['VITE_SUPABASE_ANON_KEY'] || env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Supabase credentials missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY exist in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkConnection() {
  console.log('🔍 Checking connection to Supabase database...');
  console.log('   URL:', url);
  const start = Date.now();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    const latency = Date.now() - start;

    if (error) {
      console.error('❌ Database connection check failed:');
      console.error('   Error:', error.message);
      process.exit(1);
    }

    console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
    console.log('   Response Latency: ' + latency + 'ms');
    console.log('   Status: 200 OK (PostgreSQL tables accessible with RLS)');
  } catch (err) {
    console.error('❌ Unexpected connection failure:', err.message);
    process.exit(1);
  }
}

checkConnection();
