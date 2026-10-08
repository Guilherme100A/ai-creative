const {chromium}=require('playwright-core');const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const ff=require('ffmpeg-static');const scenes=require('./scenes.json');const OUT=process.argv[2];const only=process.argv[3];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
for(const [name,sc] of Object.entries(scenes)){if(only&&!only.split(',').includes(name))continue;
 const dir=path.join(__dirname,'mf',name);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 await p.goto(require('url').pathToFileURL(path.join(__dirname,'motion.html')).href+'?s='+name+'#'+encodeURIComponent(JSON.stringify(sc)));
 await p.waitForFunction(()=>window.READY);await p.waitForTimeout(300);
 const n=Math.round(sc.dur*30);
 for(let i=0;i<n;i++){await p.evaluate(t=>render(t),i/30);await p.screenshot({path:path.join(dir,`f${String(i).padStart(4,'0')}.jpg`),type:'jpeg',quality:92});}
 execFileSync(ff,['-v','error','-y','-framerate','30','-i',path.join(dir,'f%04d.jpg'),'-c:v','libx264','-crf','16','-pix_fmt','yuv420p',path.join(OUT,name+'.mp4')]);
 console.log(name,n);}
await b.close();})();
