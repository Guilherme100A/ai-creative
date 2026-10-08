const {spawn}=require('child_process');
const ff=require('ffmpeg-static');
const W=560,H=8; // strip x 2850..3410, y 1176..1184
const p=spawn(ff,['-v','error','-i',process.argv[2],'-vf',`fps=30,crop=${W}:${H}:2850:1176,format=gray`,'-f','rawvideo','-']);
let buf=Buffer.alloc(0),i=0;const out=[];
p.stdout.on('data',d=>{buf=Buffer.concat([buf,d]);while(buf.length>=W*H){const f=buf.subarray(0,W*H);buf=buf.subarray(W*H);
 // per column: bright if median-ish of rows >140
 let right=0,cnt=0;for(let x=0;x<W;x++){let b=0;for(let y=0;y<H;y++)if(f[y*W+x]>140)b++;if(b>=H-1){cnt++;right=x;}}
 out.push([ (i/30).toFixed(2), cnt, right]);i++;}});
p.on('close',()=>{require('fs').writeFileSync(process.argv[3],out.map(r=>r.join(',')).join('\n'));console.log('frames',i)});
