const {execFileSync}=require('child_process');const ff=require('ffmpeg-static');const fs=require('fs');const path=require('path');
const X=require('./paths').ASSETS+'/sfx';const out={};
for(const d of fs.readdirSync(X))if(!d.startsWith('_')&&fs.statSync(path.join(X,d)).isDirectory())for(const f of fs.readdirSync(path.join(X,d)).filter(f=>f.endsWith('.mp3'))){
 const p=path.join(X,d,f);const raw=execFileSync(ff,['-v','error','-i',p,'-ac','1','-ar','8000','-f','f32le','-']);const a=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
 const win=160;let best=0,bt=0;for(let i=0;i+win<a.length;i+=40){let s=0;for(let j=i;j<i+win;j++)s+=a[j]*a[j];if(s>best){best=s;bt=i}}
 out[d+'/'+f]={peak:+((bt+win/2)/8000).toFixed(3),dur:+(a.length/8000).toFixed(3),rms:+Math.sqrt(best/win).toFixed(3)};}
fs.writeFileSync('sfx_peaks.json',JSON.stringify(out,null,1));console.log(out);
