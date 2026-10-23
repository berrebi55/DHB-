import os,re,sys,html,json,collections
R=sys.argv[1]
stats=collections.defaultdict(lambda: collections.Counter())
details=collections.defaultdict(list)
for site in ("groupe","infogerance","particuliers"):
    base=os.path.join(R,"sites",site)
    for d,_,fs in os.walk(base):
        for f in fs:
            if not f.endswith(".html"): continue
            p=os.path.join(d,f); rel=os.path.relpath(p,base).replace("\\","/")
            s=open(p,encoding="utf-8").read()
            S=stats[site]; S["pages"]+=1
            t=re.search(r"<title>(.*?)</title>",s,re.S); t=html.unescape(t.group(1)) if t else ""
            m=re.search(r'<meta name="description" content="(.*?)"',s); m=html.unescape(m.group(1)) if m else ""
            if len(t)>60: S["titre>60"]+=1; details[site+" titres"].append((len(t),rel,t))
            if not m: S["sans description"]+=1
            elif len(m)>160: S["desc>160"]+=1; details[site+" desc"].append((len(m),rel))
            og=re.search(r'property="og:image" content="(.*?)"',s)
            if not og: S["sans og:image"]+=1
            else: S["og:image="+og.group(1)[-40:]]+=1
            if 'rel="canonical"' not in s: S["sans canonical"]+=1
            if "noindex" in s: S["noindex"]+=1; details[site+" noindex"].append(rel)
            if "BreadcrumbList" in s: S["BreadcrumbList"]+=1
            if 'class="breadcrumb' in s or 'aria-label="Fil d' in s: S["fil visible"]+=1
            if "fonts.googleapis" in s: S["google fonts"]+=1
    S["404.html"]=int(os.path.exists(os.path.join(base,"404.html")))
for k,v in stats.items(): print(k,dict(v))
for k,v in details.items():
    print("--",k,len(v)); 
    for x in sorted(v,reverse=True)[:6]: print("  ",x)
