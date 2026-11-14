import json,glob,os,random,math,sys
sys.path.insert(0,os.path.dirname(__file__))
from stars import load
STARS=load()
R=os.path.join(os.path.dirname(__file__),'..','raw')
random.seed(2026)
teams=json.load(open(f'{R}/teams.json'))['sports'][0]['leagues'][0]['teams']
DIVS={'AFC East':'BUF MIA NE NYJ','AFC North':'BAL CIN CLE PIT','AFC South':'HOU IND JAX TEN','AFC West':'DEN KC LV LAC',
'NFC East':'DAL NYG PHI WSH','NFC North':'CHI DET GB MIN','NFC South':'ATL CAR NO TB','NFC West':'ARI LAR SF SEA'}
div_of={a:d for d,s in DIVS.items() for a in s.split()}
POSMAP={'PK':'K','FB':'RB','OL':'G','DB':'S','DE':'EDGE','NT':'DT'}
def stat(pid,yr):
  try: return json.load(open(f'{R}/st/{pid}_{yr}.json'))
  except: return {}
def draft(pid):
  try: return json.load(open(f'{R}/ath/{pid}.json')).get('draft')
  except: return None
outT=[];outP=[];fa=[]
idmap={}
for t in teams:
  t=t['team'];tid=t['id'];ab=t['abbreviation']
  r=json.load(open(f'{R}/r{tid}.json')); d=json.load(open(f'{R}/d{tid}.json'))
  coach=r.get('coach',[{}])
  coach=(coach[0].get('firstName','')+' '+coach[0].get('lastName','')).strip() if coach else ''
  outT.append([ab,t['location'],t['name'],'#'+t['color'],'#'+t.get('alternateColor','ffffff'),div_of[ab],coach])
  # depth
  rank={};slot34={}
  for it in d['items']:
    is34='3-4' in it['name']
    for k,v in it['positions'].items():
      if k in('h','pr','kr','fb'): continue
      for a in v['athletes']:
        aid=a['athlete']['$ref'].split('athletes/')[1].split('?')[0]
        rk=a['rank']
        if aid not in rank or rk<rank[aid]: rank[aid]=rk; slot34[aid]=(is34,k)
  roster=[]
  for g in r['athletes']:
    grp=g['position']
    for a in g['items']:
      pos=a['position']['abbreviation']; pos=POSMAP.get(pos,pos)
      sl=slot34.get(a['id'])
      if sl and sl[0]:
        if pos=='LB' and sl[1] in('wlb','slb'): pos='EDGE'
        if pos=='EDGE' and sl[1] in('lde','rde'): pos='DT'
      roster.append((grp,a,pos))
  for grp,a,pos in roster:
    pid=a['id']; age=a.get('age') or 25; exp=a.get('experience',{}).get('years',0)
    rk=rank.get(pid,9)
    base={1:73,2:65,3:60,4:57}.get(rk,54)
    if grp=='practiceSquad': base=min(base,55)
    dr=draft(pid); dstr='Undrafted'; drnd=0; dpk=0
    if dr: drnd=dr.get('round',0); dpk=dr.get('selection',0); dstr=f"{dr.get('year')} R{drnd} P{dpk}"
    adj=0
    if drnd==1: adj+= 6 if dpk<=10 else 4
    elif drnd==2: adj+=2
    elif drnd==0: adj-=1
    if exp<=1 and rk>1: adj-=2
    if 3<=exp<=9: adj+=2
    if age>=33: adj-=2
    s25=stat(pid,2025); s26=stat(pid,2026)
    def pg(s,k):
      gp=s.get('gen_gamesPlayed',0) or 0
      return (s.get(k,0) or 0)/gp if gp>0 else 0
    def blend(k): return 0.45*pg(s25,k)+0.55*pg(s26,k) if s26.get('gen_gamesPlayed') else pg(s25,k)
    prod=0
    if pos=='QB':
      att=blend('pas_passingAttempts')
      if att>15:
        qbr=0.45*(s25.get('pas_QBRating') or 85)+0.55*(s26.get('pas_QBRating') or s25.get('pas_QBRating') or 85)
        prod=(qbr-88)*0.45+(blend('pas_passingYards')-210)/25
    elif pos=='RB': prod=(blend('rus_rushingYards')+0.6*blend('rec_receivingYards')-45)/7
    elif pos in('WR','TE'): prod=(blend('rec_receivingYards')-(40 if pos=='WR' else 30))/6
    elif pos in('EDGE','DT'): prod=(blend('def_sacks')*14+blend('def_tacklesForLoss')*4+blend('def_QBHits')*2-3.5)
    elif pos=='LB': prod=(blend('def_totalTackles')-5)*0.9+blend('def_sacks')*8
    elif pos in('CB','S'): prod=(blend('def_passesDefended')*8+blend('def_interceptions')*18+blend('def_totalTackles')*0.4-5)
    prod=max(-6,min(10,prod))
    ovr=base+adj+prod+random.uniform(-2,2)
    name=f"{a['firstName']} {a['lastName']}"
    if name in STARS and pos in STARS[name][1]: ovr=STARS[name][0]+random.uniform(-1,1)
    if pos in('K','P','LS') and not(name in STARS and pos in STARS[name][1]): ovr=(72 if rk==1 else 58)+random.uniform(-4,4)
    ovr=int(round(max(40,min(99,ovr))))
    if age<=22: pot=ovr+random.randint(6,20)
    elif age<=24: pot=ovr+random.randint(3,14)
    elif age<=26: pot=ovr+random.randint(0,7)
    else: pot=ovr+random.randint(0,2)
    pot=min(99,pot)
    # contract estimate ($K)
    PM={'QB':55000,'EDGE':40000,'WR':36000,'OT':29000,'DT':30000,'CB':27000,'LB':19000,'S':19000,'TE':17000,'G':20000,'C':16000,'RB':14000,'K':5500,'P':3800,'LS':1400}
    if drnd>=1 and exp<=3:
      if drnd==1: sal=int(11500-(dpk-1)*230)
      elif drnd==2: sal=2100
      else: sal=1100+max(0,4-drnd)*150
      yrs=max(1,4-exp)
    else:
      f=max(0,(ovr-62)/36)**2.3
      sal=int(1100+PM.get(pos,15000)*f*random.uniform(0.85,1.1))
      yrs=random.choice([1,1,2,2,3,3,4,5]) if ovr>75 else random.choice([1,1,2,3])
      if age>=32: yrs=min(yrs,2)
    ht=a.get('height') or 72; wt=a.get('weight') or 220
    col=(a.get('college') or {}).get('shortName') or (a.get('college') or {}).get('name') or ''
    row=[pid,a['firstName'],a['lastName'],pos,ab,age,exp,a.get('jersey','') or '',ovr,pot,sal,yrs,dstr,col,int(ht),int(wt),1]
    if grp=='practiceSquad': fa.append(row)
    else: outP.append(row)
# trim teams to 53 (keep best, ensure positional minimums)
by={}
for p in outP: by.setdefault(p[4],[]).append(p)
final=[]
MIN={'QB':2,'RB':3,'WR':5,'TE':3,'OT':3,'G':3,'C':2,'EDGE':4,'DT':4,'LB':4,'CB':5,'S':4,'K':1,'P':1,'LS':1}
for ab,lst in by.items():
  lst.sort(key=lambda p:-p[8]); keep=[];cnt={}
  for p in lst:
    if cnt.get(p[3],0)<MIN.get(p[3],0): keep.append(p);cnt[p[3]]=cnt.get(p[3],0)+1
  for p in lst:
    if len(keep)>=53: break
    if p not in keep: keep.append(p)
  # cap compliance: scale vets if over 285M
  tot=sum(p[10] for p in keep)
  if tot>288000:
    k=288000/tot
    for p in keep:
      if p[10]>3000: p[10]=int(p[10]*k)
  for p in lst:
    if p not in keep: fa.append(p)
  final+=keep
for p in fa: p[4]='FA'; p[11]=0
fa.sort(key=lambda p:-p[8]); fa=fa[:220]
# schedule
sched={}
for t in teams:
  s=json.load(open(f"{R}/s{t['team']['id']}.json"))
  for e in s['events']:
    if e.get('seasonType',{}).get('type')!=2: continue
    c=e['competitions'][0]; h=[x for x in c['competitors'] if x['homeAway']=='home'][0]['team']['abbreviation']; a_=[x for x in c['competitors'] if x['homeAway']=='away'][0]['team']['abbreviation']
    sched[e['id']]=(e['week']['number'],h,a_,e['date'])
weeks=[[] for _ in range(18)]
for eid,(w,h,a_,dt) in sorted(sched.items(),key=lambda x:x[1][3]): weeks[w-1].append([h,a_])
print('games',sum(len(w) for w in weeks),[len(w) for w in weeks],'players',len(final),'fa',len(fa))
data={'cap':301200,'season':2026,'teams':outT,'players':final+fa,'weeks':weeks,'fetched':'2026-11-13'}
out=os.path.join(os.path.dirname(__file__),'..','src','data.js')
open(out,'w').write('var HC_DATA='+json.dumps(data,separators=(',',':'))+';if(typeof module!=="undefined")module.exports=HC_DATA;\n')
print(os.path.getsize(out))
