import json,os,re,shutil
cfg=json.load(open('ads.json'))
# 1) identifiants AdMob dans le jeu
p='www/index.html';s=open(p,encoding='utf-8').read()
inj='<script>window.SF_ADS=%s</script>'%json.dumps({'rewarded':cfg['rewarded'],'test':cfg['test']})
s=s.replace('<head>','<head>'+inj,1);open(p,'w',encoding='utf-8').write(s)
# 2) manifeste : ID d'application AdMob
m='android/app/src/main/AndroidManifest.xml';x=open(m).read()
meta='<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="%s"/>'%cfg['app_id']
x=re.sub(r'(<application[^>]*>)',lambda g:g.group(1)+'\n        '+meta,x,count=1)
x=x.replace('android:name=".MainActivity"','android:name=".MainActivity"\n            android:screenOrientation="fullUser"',1)
open(m,'w').write(x)
# 3) version
g='android/app/build.gradle';t=open(g).read()
t=re.sub(r'versionCode \d+','versionCode %d'%cfg['versionCode'],t);t=re.sub(r'versionName "[^"]*"','versionName "%s"'%cfg['versionName'],t)
open(g,'w').write(t)
# 4) plein écran immersif
d='android/app/src/main/java/com/seddikfire/jeu';open(d+'/MainActivity.java','w').write(open('MainActivity.java').read())
# 5) icônes
for r in os.listdir('res'):
  dst='android/app/src/main/res/'+r;os.makedirs(dst,exist_ok=True)
  for f in os.listdir('res/'+r):shutil.copy('res/'+r+'/'+f,dst+'/'+f)
print('patch ok')
