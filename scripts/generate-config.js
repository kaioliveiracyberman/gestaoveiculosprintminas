const fs = require('fs');
const path = require('path');

// Use env vars if set, otherwise fall back to defaults
const cfg = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://bkqpdfzyovrqfprvswqk.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'sb_publishable_F0lwWPJOUKCvf1Hl5_wJRg_STlD9eC7',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'suporte@printminas.com.br'
};

const out = `window.__CONFIG__ = ${JSON.stringify(cfg)};`;
const targetDir = path.join(__dirname, '..', 'js');
if(!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(path.join(targetDir, 'config.js'), out, 'utf8');
console.log('Wrote js/config.js with SUPABASE_URL=' + (cfg.SUPABASE_URL ? 'set' : 'empty') + ', SUPABASE_ANON_KEY=' + (cfg.SUPABASE_ANON_KEY ? 'set' : 'empty'));
