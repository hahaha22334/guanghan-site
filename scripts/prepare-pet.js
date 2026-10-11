/* Deterministic packaging only: retain the supplied artwork, grid, transparency and poses. */
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const source=path.resolve(process.argv[2] || path.join(root,'..'));
const actions=['idle','wave','pet','hop','think','talk','point','stamp','sleep'];
(async()=>{
  const output=path.join(root,'assets/pet'); fs.mkdirSync(output,{recursive:true});
  for(const [i,action] of actions.entries()) {
    const file=fs.readdirSync(source).find(f=>f.endsWith(`-${i+1}.png`));
    if(!file) throw new Error(`Missing supplied sheet ${i+1}`);
    const meta=await sharp(path.join(source,file)).metadata();
    if(Math.abs(meta.width/meta.height-2)>.01 || !meta.hasAlpha) throw new Error(`Invalid sheet ${file}`);
    await sharp(path.join(source,file)).resize(1024,512).webp({quality:86,alphaQuality:100}).toFile(path.join(output,action+'.webp'));
  }
  const files=fs.readdirSync(output).map(f=>({file:f,bytes:fs.statSync(path.join(output,f)).size}));
  console.log('已打包九套透明动作精灵图：',files);
})().catch(e=>{console.error(e);process.exit(1);});
