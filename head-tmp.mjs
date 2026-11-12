import puppeteer from 'puppeteer'
const b = await puppeteer.launch({headless:'new',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']})
const p = await b.newPage(); await p.setViewport({width:1280,height:720,deviceScaleFactor:4})
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto('http://localhost:4399/?scene=lesson-forest.0',{waitUntil:'load'})
await new Promise(r=>setTimeout(r,105000))
await p.keyboard.press('Space')
await new Promise(r=>setTimeout(r,2000))
const info = await p.evaluate(()=>{const l=window.__lvl; const pr=l.predator; const h=pr.segments[0]; l.heroInst.character.pos.x=h.x-420; l.heroInst.character.pos.y=h.y-100; return {hx:h.x,hy:h.y,dir:pr.dir,state:pr.state}})
console.log(JSON.stringify(info), errs.slice(0,5))
for (let i=0;i<4;i++){ await new Promise(r=>setTimeout(r,2500)); const h=await p.evaluate(()=>{const q=window.__lvl.predator;const g=q.segments[0];const k=window.__lvl.k;const c=k.getCamPos();const sc=k.getCamScale().x;return {x:(g.x-c.x)*sc+k.width()/2,y:(g.y-c.y)*sc+k.height()/2,dir:q.dir,state:q.state,w:k.width(),h:k.height()}}); console.log(JSON.stringify(h)); await p.screenshot({path:`/tmp/hd${i}.png`,clip:{x:Math.max(0,h.x-70),y:Math.max(0,h.y-60),width:140,height:100}}) }
await b.close()
