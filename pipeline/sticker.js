// gera PNGs transparentes de uma reação animada (com cache). uso: node sticker.js '[{"emoji":"1f62d","style":"shake","dur":1.3,"tilt":0},...]'
const {chromium}=require('playwright-core');const fs=require('fs');const path=require('path');const {pathToFileURL}=require('url');
const R=require('./paths').ASSETS+'/reacoes';const CACHE=path.join(__dirname,'stk');
const jobs=JSON.parse(process.argv[2]);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:480,height:480}});
 for(const j of jobs){const dir=path.join(CACHE,`${j.emoji}_${j.style}_${Math.round(j.dur*30)}_${j.tilt||0}`);
  if(fs.existsSync(path.join(dir,'done')))continue;fs.mkdirSync(dir,{recursive:true});
  await p.goto(pathToFileURL(path.join(__dirname,'sticker.html')).href);
  const data=JSON.parse(fs.readFileSync(path.join(R,j.emoji+'.json'),'utf8'));
  await p.evaluate(([d,pp])=>setup(d,pp),[data,j]);await p.waitForTimeout(200);
  const n=Math.round(j.dur*30);
  for(let i=0;i<n;i++){await p.evaluate(t=>render(t),i/30);await p.screenshot({path:path.join(dir,`s${String(i+1).padStart(4,'0')}.png`),omitBackground:true});}
  fs.writeFileSync(path.join(dir,'done'),'');console.log(dir);}
 await b.close();})();
