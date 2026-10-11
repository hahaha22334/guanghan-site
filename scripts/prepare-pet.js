/* Deterministic packaging only: retain the supplied artwork, transparency and poses. */
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const source=path.resolve(process.argv[2] || path.join(root,'..'));
const actions=['idle','wave','pet','hop','think','talk','point','stamp','sleep'];
async function splitSprites(file) {
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];
  let id=0;
  for(let p=0;p<w*h;p++) {
    if(labels[p] || data[p*4+3]<96)continue;
    id++;let head=0,tail=1,x0=p%w,x1=x0,y0=Math.floor(p/w),y1=y0;queue[0]=p;labels[p]=id;
    while(head<tail) {
      const k=queue[head++],x=k%w,y=Math.floor(k/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const n of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1]) {
        if(n>=0 && !labels[n] && data[n*4+3]>=96){labels[n]=id;queue[tail++]=n;}
      }
    }
    if(tail>2000)parts.push({id,x0,x1,y0,y1});
  }
  // A feather tip can touch the previous row's toes. Separate only that narrow join.
  for(const part of [...parts])if(part.y1-part.y0>h*.4) {
    const midpoint=Math.round((part.y0+part.y1)/2);let cut=midpoint,lowest=Infinity;
    for(let y=midpoint-35;y<=midpoint+35;y++) {
      let count=0;for(let x=part.x0;x<=part.x1;x++)if(labels[y*w+x]===part.id)count++;
      if(count<lowest){lowest=count;cut=y;}
    }
    const lower={id:++id,x0:w,x1:0,y0:h,y1:0},upper={id:part.id,x0:w,x1:0,y0:h,y1:0};
    for(let y=part.y0;y<=part.y1;y++)for(let x=part.x0;x<=part.x1;x++)if(labels[y*w+x]===part.id) {
      const box=y<cut?upper:lower;labels[y*w+x]=box.id;box.x0=Math.min(box.x0,x);box.x1=Math.max(box.x1,x);box.y0=Math.min(box.y0,y);box.y1=Math.max(box.y1,y);
    }
    parts.splice(parts.indexOf(part),1,upper,lower);
  }
  if(parts.length!==16)throw new Error(`Expected 16 complete sprites in ${file}; found ${parts.length}`);
  const columns=Array.from({length:4},()=>[]);
  for(const part of parts)columns[Math.min(3,Math.floor((part.x0+part.x1)/2/(w/4)))].push(part);
  if(columns.some(col=>col.length!==4))throw new Error(`Unable to identify four columns in ${file}`);
  columns.forEach(col=>col.sort((a,b)=>a.y0-b.y0));
  const large=new Set(parts.map(part=>part.id));
  return Array.from({length:16},(_,frame)=>{
    const part=columns[frame%4][Math.floor(frame/4)];
    const left=Math.max(0,part.x0-2),top=Math.max(0,part.y0-2),width=Math.min(w,part.x1+3)-left,height=Math.min(h,part.y1+3)-top;
    const pixels=Buffer.alloc(width*height*4);let footX=0,footCount=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
      const p=(y+top)*w+x+left,label=labels[p];
      if(large.has(label) && label!==part.id)continue;
      data.copy(pixels,(y*width+x)*4,p*4,p*4+4);
      if(label===part.id && y+top>part.y1-(part.y1-part.y0)*.07){footX+=x;footCount++;}
    }
    return {pixels,width,height,anchor:footCount?footX/footCount:width/2};
  });
}
(async()=>{
  const output=path.join(root,'assets/pet'); fs.mkdirSync(output,{recursive:true});
  for(const [i,action] of actions.entries()) {
    const file=fs.readdirSync(source).filter(f=>f.endsWith(`-${i+1}.png`)).sort().at(-1);
    if(!file) throw new Error(`Missing supplied sheet ${i+1}`);
    const meta=await sharp(path.join(source,file)).metadata();
    if(Math.abs(meta.width/meta.height-1)>.01 || !meta.hasAlpha) throw new Error(`Expected a transparent 4×4 sheet: ${file}`);
    // AI sheets have uneven row heights. Extract complete silhouettes instead of cutting toes.
    const sprites=await splitSprites(path.join(source,file));
    const cells=[];
    for(const [frame,sprite] of sprites.entries()) {
      const scale=.64,width=Math.round(sprite.width*scale),height=Math.round(sprite.height*scale);
      const image=await sharp(sprite.pixels,{raw:{width:sprite.width,height:sprite.height,channels:4}}).resize(width,height).png().toBuffer();
      const jump=action==='hop'?[0,3,6,1,-7,-14,-20,-21,-17,-9,0,5,2,0,0,0][frame]:0;
      const left=Math.max(8,Math.min(248-width,Math.round(128-sprite.anchor*scale))),top=244-height+jump;
      const input=await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input:image,left,top}]).png().toBuffer();
      cells.push({input,left:frame%4*256,top:Math.floor(frame/4)*256});
    }
    await sharp({create:{width:1024,height:1024,channels:4,background:'#00000000'}})
      .composite(cells).webp({quality:86,alphaQuality:100}).toFile(path.join(output,action+'.webp'));
  }
  const files=fs.readdirSync(output).map(f=>({file:f,bytes:fs.statSync(path.join(output,f)).size}));
  console.log('已打包九套透明动作精灵图：',files);
})().catch(e=>{console.error(e);process.exit(1);});
