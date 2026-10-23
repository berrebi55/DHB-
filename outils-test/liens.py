import re,glob,os,sys
racine=sys.argv[1]; casses=[]; n=0
for f in glob.glob(os.path.join(racine,'sites','**','*.html'),recursive=True):
    h=open(f,encoding='utf-8').read(); d=os.path.dirname(f)
    for u in re.findall(r'<(?!base)[^>]*?(?:href|src)="([^"]+)"',h):
        if re.match(r'^(https?:|mailto:|tel:|#|data:|javascript:)',u) or '{' in u: continue
        n+=1; p=u.split('#')[0].split('?')[0]
        if not p: continue
        t=os.path.normpath(os.path.join(d,p))
        if os.path.isdir(t): t=os.path.join(t,'index.html')
        if not os.path.exists(t): casses.append((os.path.relpath(f,racine),u))
print(n,"liens internes vérifiés ;",len(casses),"cassés"); [print(c) for c in casses[:10]]
