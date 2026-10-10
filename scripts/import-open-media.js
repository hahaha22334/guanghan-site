/* Import the two reviewed, openly licensed transport images with attribution. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const records = JSON.parse(fs.readFileSync(path.join(root,'../media-staging/research-2026-10-10/commons-sources.json'),'utf8'));
const ledgerPath = path.join(root,'.asset-sources.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
(async () => {
  for (const record of records) {
    const file = path.join(root,'..',record.localPath);
    const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (sha !== record.sha256 || record.metadata.LicenseShortName !== 'CC BY-SA 4.0') throw new Error('Source verification failed');
    const sitePath = `images/external/${record.name}.jpg`;
    fs.copyFileSync(file,path.join(root,sitePath));
    const optimizedPaths = [];
    for (const width of [400,800,1200,1600]) {
      for (const format of ['avif','webp']) {
        const out = `images/optimized/${record.name}-${width}w.${format}`;
        if (!fs.existsSync(path.join(root,out))) await sharp(file).rotate().resize({width,withoutEnlargement:true})[format]({quality:format==='avif'?52:80}).toFile(path.join(root,out));
        optimizedPaths.push(out);
      }
    }
    const item = {sitePath, sha256:sha, sourceAssetId:'sha256:'+sha,sourceUrl:record.sourceUrl,platform:'wikimedia-commons',
      creatorDisplay:record.name==='sanxingdui-station'?'Underbar dk':'Liuxingy',
      capturedAt:record.name==='sanxingdui-station'?'2024-12-10':'2018-05-20',
      importedAt:'2026-10-10',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
      changes:'Responsive resizing and AVIF/WebP compression; displayed with layout cropping. Adapted images retain CC BY-SA 4.0.',
      location:record.name==='sanxingdui-station'?'广汉三星堆铁路站站前':'广汉北站站台，从列车内拍摄',
      purpose:'出行指南：识别铁路车站；有拍摄日期的历史影像，不作为现行服务说明。',optimizedPaths};
    const previous = ledger.assets.findIndex(a=>a.sitePath===sitePath);
    if(previous<0) ledger.assets.push(item); else ledger.assets[previous]=item;
    console.log('Imported:',record.name);
  }
  fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n','utf8');
})().catch(e=>{console.error(e);process.exit(1);});
