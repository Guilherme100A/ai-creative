const {chromium}=require('playwright-core');const D=require('./paths').ASSETS+'/motion/';
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const [n,w,h] of [['box',920,920]]){
 await p.setViewportSize({width:w,height:h});
 await p.setContent(`<body style="margin:0;background:#000"><div style="width:${w}px;height:${h}px;border-radius:64px;background:#fff"></div></body>`);
 await p.screenshot({path:D+`mask_${n}.png`});
 await p.setContent(`<body style="margin:0;background:transparent"><div style="box-sizing:border-box;width:${w}px;height:${h}px;border-radius:64px;border:9px solid #c6f36b;box-shadow:inset 0 0 30px rgba(198,243,107,.35)"></div></body>`);
 await p.screenshot({path:D+`borda_${n}.png`,omitBackground:true});}
await b.close();})();
