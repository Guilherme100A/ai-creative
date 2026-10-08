// renderiza o quadrado 3D (PNG com transparência) por cima de frames de gameplay já extraídos
const {chromium}=require('playwright-core');const path=require('path');const {pathToFileURL}=require('url');
const P=JSON.parse(process.argv[2]);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto(pathToFileURL(path.join(__dirname,'box3d.html')).href+'#'+encodeURIComponent(JSON.stringify(P)));
 for(let i=0;i<P.n;i++){const src=pathToFileURL(path.join(P.frames,`f${String(i+1).padStart(4,'0')}.jpg`)).href;
  await p.evaluate(async([src,t])=>{const im=document.getElementById('img');im.src=src;await im.decode();render(t);},[src,P.off+i/30]);
  await p.screenshot({path:path.join(P.out,`o${String(i+1).padStart(4,'0')}.png`),omitBackground:true});}
 await b.close();})();
