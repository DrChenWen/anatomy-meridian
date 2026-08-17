import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const modelUid = 'c3f13a4baa2f4ea5a0a88d29e7fa1779';
const outDir = 'C:/Users/USER/Downloads/anatomy-meridian/public/models';
const outPath = path.join(outDir, 'body-male.glb');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const apiUrl = `https://api.sketchfab.com/v3/models/${modelUid}/download`;
console.log('Step 1: Getting download URL from', apiUrl);

https.get(apiUrl, { headers: { 'User-Agent': 'MeridianAtlas/1.0' } }, (res) => {
  console.log('API Status:', res.statusCode);
  
  if (res.statusCode === 302 || res.statusCode === 301) {
    const dlUrl = res.headers.location;
    console.log('Got redirect URL:', dlUrl ? dlUrl.substring(0, 80) + '...' : 'none');
    
    if (!dlUrl) { console.log('No redirect URL'); return; }
    
    https.get(dlUrl, { headers: { 'User-Agent': 'MeridianAtlas/1.0' } }, (res2) => {
      console.log('Download Status:', res2.statusCode, 'Content-Length:', res2.headers['content-length']);
      
      if (res2.statusCode === 200) {
        const file = fs.createWriteStream(outPath);
        let downloaded = 0;
        res2.on('data', (chunk) => {
          downloaded += chunk.length;
          const pct = res2.headers['content-length'] 
            ? Math.round(downloaded / parseInt(res2.headers['content-length']) * 100) 
            : '?';
          if (downloaded % (1024 * 512) < chunk.length) process.stdout.write(`\r  ${pct}%...`);
        });
        res2.pipe(file);
        file.on('finish', () => {
          const size = fs.statSync(outPath).size;
          console.log('\nDone! Downloaded:', (size / 1024 / 1024).toFixed(1), 'MB');
        });
      } else {
        console.log('Download failed, status:', res2.statusCode);
      }
    }).on('error', e => console.error('Download error:', e.message));
    
  } else {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('Response:', data.substring(0, 1000));
    });
  }
}).on('error', e => console.error('API error:', e.message));
