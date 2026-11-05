import json, sys, os, shutil
D='/home/user/porto-vecchio/.claude/worktrees/ritmo8/v7/_immagini/ritmo8'
for run in sys.argv[1:]:
    p=f'out/{run}/risultati.json'
    if not os.path.exists(p): continue
    R=json.load(open(p))
    for k,T in R['tratti'].items():
        lt=T.get('longtask')
        if isinstance(lt,list) and lt and isinstance(lt[0],dict):
            T['longtaskTot']={'n':len(lt),'ms':round(sum(x['ms'] for x in lt))}; T['longtask']=sorted(lt,key=lambda x:-x['ms'])[:15]
        elif isinstance(lt,list): T['longtaskTot']={'n':len(lt),'ms':round(sum(x[1] for x in lt))}; T['longtask']=sorted(lt,key=lambda x:-x[1])[:15]
        if 'prof' in T: T['prof']['incl']=T['prof']['incl'][:45]; T['prof']['self']=T['prof']['self'][:30]
        T.pop('glLento',None)
    json.dump(R,open(f'{D}/percorso_{run}.json','w'),indent=0,ensure_ascii=False)
for f in ['out/banco_base.json','out/banco_dopo2.json','out/banco_tel_base.json','out/banco_tel_dopo.json','sonda_eq.json','sonda_cast_a.json','sonda_cast_b.json','sonda2.json']:
    if os.path.exists(f): shutil.copy(f, D+'/'+os.path.basename(f).replace('dopo2','dopo'))
for f in ['strum.js','lib.js','percorso.js','banco.js','sonda_cast.js','sonda2.js','sonda_worker.js','sonda_eq.js','confronta.py']:
    shutil.copy(f, D+'/strumenti/'+f)
for f in ['sonda_worker.log','sonda_worker2.log']: shutil.copy(f, D+'/'+f)
