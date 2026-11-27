import asyncio,base64,json,os,sys
from playwright.async_api import async_playwright
A=[('idle','pack/idle aiming.fbx',16,True,None,.62,False),
   ('run','pack/run forward.fbx',16,True,None,.76,False),
   ('fire','Firing_Rifle_1.fbx',12,True,None,.72,False),
   ('reload','Reload_1.fbx',24,False,None,.66,False),
   ('toss','Toss_Grenade_1.fbx',24,False,None,.8,False),
   ('dance','Hip_Hop_Dancing_1.fbx',24,True,(2.0,6.0),.85,False),
   ('death','pack/death from the front.fbx',20,False,None,1.4,True)]
only=sys.argv[1:] 
async def main():
    os.makedirs('frames',exist_ok=True)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--js-flags=--max-old-space-size=4096'])
        pg=await b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8767/mx.html');await pg.wait_for_function('window.READY',timeout=300000)
        print('info',await pg.evaluate('INFO'))
        meta={}
        for name,url,n,loop,seg,span,keep in A:
            if only and name not in only: continue
            nm,dur=await pg.evaluate(f'load({json.dumps(url)},{json.dumps(keep)})')
            t0,t1=seg if seg else (0,dur*(1 if loop else .96))
            r=await pg.evaluate(f'frames({json.dumps(url)},{n},{t0},{t1},{json.dumps(loop)},{span})')
            for i,d in enumerate(r['out']): open(f'frames/{name}_{i:02d}.png','wb').write(base64.b64decode(d.split(',')[1]))
            meta[name]={'n':n,'loop':loop,'dur':round(t1-t0,3),'span':span,'hands':r['hands']}
            print(name,nm,round(dur,2),'ok',flush=True)
        old=json.load(open('meta.json')) if os.path.exists('meta.json') and only else {}
        old.update(meta);json.dump(old,open('meta.json','w'))
        print(errs[:5]);await b.close()
asyncio.run(main())
