const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const p=await c.newPage();await p.goto('https://basic-build-staging.rhianszlafaiete.workers.dev/',{waitUntil:'networkidle'});await p.waitForTimeout(3000);
// trigger lazy content
const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=400){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(250);}await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(1500);
const out=require('./paths').ASSETS+'/site/';
await p.screenshot({path:out+'site_mobile_full.png',fullPage:true});
await p.screenshot({path:out+'site_mobile_topo.png'});
console.log('height',h);await b.close();})();
