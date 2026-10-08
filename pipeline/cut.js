const {execFileSync}=require('child_process');const ff=require('ffmpeg-static');const path=require('path');
const [IN,BASE,PFX,DUR]=process.argv.slice(2);const ev=require(path.resolve(process.argv[6]||'events.json'));const n={};
for(const e of ev){const k=e.folder+e.key;n[k]=(n[k]||0)+1;
 const a=Math.max(0,e.start-1),b=Math.min(+DUR,e.end+1);
 const out=path.join(BASE,e.folder,e.sub,`${PFX}_${e.key}_${n[k]}.mp4`);
 execFileSync(ff,['-v','error','-y','-ss',a.toFixed(2),'-to',b.toFixed(2),'-i',IN,'-c:v','libx264','-preset','fast','-crf','18','-c:a','aac','-b:a','192k',out]);
 console.log(path.relative(BASE,out),a.toFixed(2),'->',b.toFixed(2));}
