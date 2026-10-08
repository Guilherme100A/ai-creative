const {spawn}=require('child_process');const fs=require('fs');
const ff=require('ffmpeg-static');
const X0=2840,Y0=980,W=600,H=420,FPS=30;
const strips=[1176,1286,1388];
const TG={y:1000,h:50,x:2950,w:380}, TC={y:1110,h:50,x:2850,w:580};
function bin(f,r){const a=new Uint8Array(r.w*r.h);for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)a[y*r.w+x]=f[(r.y-Y0+y)*W+(r.x-X0+x)]>200?1:0;return a}
function iou(a,b){let i=0,u=0;for(let k=0;k<a.length;k++){if(a[k]&&b[k])i++;if(a[k]||b[k])u++;}return u?i/u:0}
function run(f,ys){let last=0,gap=0;for(let x=2860;x<3350;x++){let ok=true;for(let y=ys;y<ys+6;y++)if(f[(y-Y0)*W+(x-X0)]<140){ok=false;break}if(ok){last=x;gap=0}else if(++gap>3)break;}return last?last-2860:0}
async function frames(ss,n,cb){return new Promise(r=>{const args=['-v','error'];if(ss!=null)args.push('-ss',ss);args.push('-i',process.argv[2]);if(n)args.push('-frames:v',n);args.push('-vf',`fps=${FPS},crop=${W}:${H}:${X0}:${Y0},format=gray`,'-f','rawvideo','-');const p=spawn(ff,args);let buf=Buffer.alloc(0),i=0;p.stdout.on('data',d=>{buf=Buffer.concat([buf,d]);while(buf.length>=W*H){cb(buf.subarray(0,W*H),i++);buf=buf.subarray(W*H);}});p.on('close',r)})}
(async()=>{
 const T={};
 await frames(5,1,f=>T.G=bin(f,TG)); await frames(0,1,f=>T.C=bin(f,TC)); await frames(118,1,f=>T.S=bin(f,TC));
 const out=[];
 await frames(null,0,(f,i)=>{const g=iou(bin(f,TG),T.G),bt=bin(f,TC),c=iou(bt,T.C),s=iou(bt,T.S);
  let wpn='-';const m=Math.max(g,c,s);if(m>0.5)wpn=m===g?'G':m===c?'C':'S';
  out.push([(i/FPS).toFixed(3),wpn,...strips.map(y=>run(f,y)),g.toFixed(2),c.toFixed(2),s.toFixed(2)].join(','));});
 fs.writeFileSync(process.argv[3],out.join('\n'));console.log(out.length);
})();
