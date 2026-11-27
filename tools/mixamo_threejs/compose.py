import json,math,os
from PIL import Image, ImageFilter, ImageEnhance
m=json.load(open('meta.json'));order=['idle','run','fire','reload','toss','dance','death']
S=160;maxn=max(m[k]['n'] for k in order)
sheet=Image.new('RGBA',(maxn*S,len(order)*S),(0,0,0,0))
def med(l):l=sorted(l);return l[len(l)//2]
gunang=lambda h:math.atan2(h[3]-h[1],h[2]-h[0])
corr={k:med([gunang(h) for h in m[k]['hands']]) for k in ['idle','run','fire']};corr['reload']=corr['idle']
out={'cell':S,'order':order,'anims':{}}
for r,k in enumerate(order):
    a=corr.get(k,0.0);n=m[k]['n'];half=m[k]['span']*48;hands=[]
    for i in range(n):
        im=Image.open(f'frames/{k}_{i:02d}.png').convert('RGBA')
        if a: im=im.rotate(math.degrees(a),resample=Image.BICUBIC,center=(S/2,S/2))
        rgb=im.convert('RGB');al=im.getchannel('A')
        rgb=ImageEnhance.Brightness(rgb).enhance(1.18);rgb=ImageEnhance.Contrast(rgb).enhance(1.12)
        im=Image.merge('RGBA',(*rgb.split(),al))
        ol=al.point(lambda v:255 if v>40 else 0).filter(ImageFilter.MaxFilter(3))
        base=Image.new('RGBA',(S,S),(20,16,12,0));base.putalpha(ol.point(lambda v:int(v*.85)))
        base.alpha_composite(im);sheet.alpha_composite(base,(i*S,r*S))
        h=m[k]['hands'][i];c,s=math.cos(-a),math.sin(-a);rot=lambda x,y:[round(x*c-y*s,1),round(x*s+y*c,1)]
        hands.append(rot(h[0],h[1])+rot(h[2],h[3]))
    out['anims'][k]={'row':r,'n':n,'loop':m[k]['loop'],'dur':m[k]['dur'],'half':round(half,1),'hands':hands}
sheet.save('swat.webp','WEBP',quality=88,method=6)
json.dump(out,open('swat.json','w'),separators=(',',':'))
print(sheet.size,os.path.getsize('swat.webp'))
pv=Image.new('RGBA',(S*20,S),(196,170,120,255));pv.alpha_composite(sheet.crop((0,6*S,20*S,7*S)));pv.convert('RGB').save('/home/claude/mxdeath.png')
