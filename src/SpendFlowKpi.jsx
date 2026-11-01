import React,{useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {RefreshCw,LogIn,LogOut,Wallet,CalendarCheck2,ClipboardCheck,TrendingDown,Star} from 'lucide-react';
import './SpendFlowKpi.css';

// Public Supabase URL and publishable/anon key only. Never use a service-role key in a browser.
const url=import.meta.env.VITE_SPEND_SUPABASE_URL;
const key=import.meta.env.VITE_SPEND_SUPABASE_ANON_KEY;
const spend=url&&key?createClient(url,key,{auth:{storageKey:'ninety-day-spend-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const day=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));};
const iso=d=>d.toISOString().slice(0,10);
const add=(s,n)=>{const d=day(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const month=s=>s.slice(0,7);
const byMonth=(s)=>{const [y,m]=s.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate();};
const toNum=v=>Number(v)||0;
const amountOf=e=>toNum(e.amount);
const won=n=>Math.round(n).toLocaleString('ko-KR')+'원';
const reduceTypes={식료품:new Set(['유제품','냉동식품']),외식:new Set(['배달','커피'])};
const reducedAmount=e=>{
  const set=reduceTypes[e.category];if(!set)return 0;
  if(set.has(e.subcategory))return amountOf(e);
  const items=(e.items||[]).filter(x=>set.has(x.type));
  return items.reduce((s,x)=>s+toNum(x.amount),0);
};
const nonDiscretionary=e=>!!e.fixedId||!!e.taxId||e.category==='세금';
function calculate(store,start,now){
  const end=add(start,89),until=now<end?now:end;
  const dates=[];for(let d=start;d<=until;d=add(d,1))dates.push(d);
  const exp=(store.expenses||[]).filter(e=>e.date>=start&&e.date<=until);
  const perMonth={};for(const date of dates)perMonth[month(date)]=(perMonth[month(date)]||0)+1;
  const budget=Object.entries(perMonth).reduce((sum,[m,days])=>{
    const raw=store.monthlyBudgets?.[m]??store.monthlyBudget??0;
    return sum+toNum(raw)*days/byMonth(m);
  },0);
  const spent=exp.reduce((sum,e)=>sum+amountOf(e),0);
  const spentDays=new Set(exp.filter(e=>!nonDiscretionary(e)&&amountOf(e)>0).map(e=>e.date));
  const noSpend=dates.filter(date=>!spentDays.has(date)).length;
  const labeled=exp.filter(e=>e.consumptionType==='planned'||e.consumptionType==='unplanned');
  const planned=labeled.filter(e=>e.consumptionType==='planned').length;
  const planRate=labeled.length?planned/labeled.length*100:null;
  const currentReduce=exp.reduce((s,e)=>s+reducedAmount(e),0);
  const baselineStart=add(start,-dates.length),baselineEnd=add(start,-1);
  const baseline=(store.expenses||[]).filter(e=>e.date>=baselineStart&&e.date<=baselineEnd).reduce((s,e)=>s+reducedAmount(e),0);
  const reduction=baseline?((baseline-currentReduce)/baseline*100):null;
  return {end,until,days:dates.length,budget,spent,reserve:budget-spent,noSpend,planned,classified:labeled.length,unclassified:exp.length-labeled.length,planRate,reduction,baseline,currentReduce};
}
const spendTargets=stats=>{
  return [{key:'reserve',name:'예산 잔액 확보',goal:900000,unit:'원',icon:Wallet,value:stats?.reserve,display:stats?won(stats.reserve):'—',note:'90일 기간에 배분된 월 예산 − 실제 지출'},{key:'noSpend',name:'무지출 데이',goal:30,unit:'일',icon:CalendarCheck2,value:stats?.noSpend,display:stats?stats.noSpend+'일':'—',note:'고정비·세금 제외, 지출 기록이 없는 날'},{key:'planRate',name:'계획 소비율',goal:80,unit:'%',icon:ClipboardCheck,value:stats?.planRate,display:stats?.planRate==null?'집계 불가':stats.planRate.toFixed(1)+'%',note:`분류 ${stats?.classified??0}건 · 미분류 ${stats?.unclassified??0}건`},{key:'reduction',name:'줄이기 소비 감소',goal:20,unit:'%',icon:TrendingDown,value:stats?.reduction,display:stats?.reduction==null?'기준 자료 없음':stats.reduction.toFixed(1)+'%',note:'프로젝트 시작 전 동일 일수의 줄이기 소비와 비교'}];
};

export function SpendKpiCard({start,featured=[]}){
  const [session,setSession]=useState(null),[stats,setStats]=useState(null),[loading,setLoading]=useState(true);
  const now=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
  useEffect(()=>{
    if(!spend){setLoading(false);return;}
    let live=true;
    const fetchStats=async(s)=>{
      if(!s?.user?.id){if(live){setStats(null);setLoading(false)}return;}
      const {data,error}=await spend.from('spend_flow_data').select('payload').eq('user_id',s.user.id).maybeSingle();
      if(!live)return;
      setStats(error?null:calculate(data?.payload||{},start||now,now));setLoading(false);
    };
    spend.auth.getSession().then(({data})=>{if(!live)return;setSession(data.session);fetchStats(data.session)});
    const {data:{subscription}}=spend.auth.onAuthStateChange((_e,s)=>{if(!live)return;setSession(s);fetchStats(s)});
    const refresh=()=>{if(document.visibilityState==='visible')spend.auth.getSession().then(({data})=>{if(live)fetchStats(data.session)})};
    window.addEventListener('focus',refresh);
    return()=>{live=false;subscription.unsubscribe();window.removeEventListener('focus',refresh)};
  },[start,now]);
  const options=spendTargets(stats);
  const selected=featured.map(k=>options.find(o=>o.key===k)).filter(Boolean).slice(0,2);
  if(!featured.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
  return <>{selected.map(t=><div className="kpi-preview" key={t.key}><small>{t.name}</small><strong>{!session?'연결 필요':loading?'불러오는 중':t.display}</strong><span>목표 {t.goal.toLocaleString('ko-KR')}{t.unit}</span></div>)}</>;
}
export default function SpendFlowKpi({start,featured=[],onToggleFeatured}){
  const [session,setSession]=useState(null),[login,setLogin]=useState({email:'',password:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[payload,setPayload]=useState(null),[updated,setUpdated]=useState('');
  useEffect(()=>{if(!spend)return;let live=true;spend.auth.getSession().then(({data})=>{if(live)setSession(data.session)});const {data:{subscription}}=spend.auth.onAuthStateChange((_event,s)=>{if(live){setSession(s);setPayload(null)}});return()=>{live=false;subscription.unsubscribe()};},[]);
  const load=async()=>{if(!spend||!session?.user)return;setBusy(true);setError('');try{const {data,error:err}=await spend.from('spend_flow_data').select('payload').eq('user_id',session.user.id).maybeSingle();if(err)throw err;setPayload(data?.payload||{});setUpdated(new Date().toLocaleString('ko-KR'));}catch(e){setError('Spend Flow 기록을 읽을 수 없어요: '+e.message)}finally{setBusy(false)}};
  useEffect(()=>{if(session?.user?.id)load()},[session?.user?.id]);
  const now=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
  const stats=useMemo(()=>payload?calculate(payload,start||now,now):null,[payload,start,now]);
  const targets=spendTargets(stats);
  const signIn=async e=>{e.preventDefault();if(!spend)return;setBusy(true);setError('');const {error:err}=await spend.auth.signInWithPassword(login);if(err)setError(err.message);setBusy(false);setLogin(x=>({...x,password:''}))};
  return <section className="sf-link">
    <header className="sf-link-head"><div><strong>Save &amp; Spend · Spend Flow 연동</strong><small>읽기 전용 · 90일 목표 · {start||now} ~ {stats?.end||add(start||now,89)}</small></div>{session&&<button type="button" onClick={load} disabled={busy} title="다시 불러오기"><RefreshCw size={16}/></button>}</header>
    {!spend?<p className="sf-notice">Spend Flow 연결 환경변수 VITE_SPEND_SUPABASE_URL 및 VITE_SPEND_SUPABASE_ANON_KEY를 Cloudflare Pages에 추가해야 해.</p>:!session?<form onSubmit={signIn} className="sf-login"><p>Spend Flow 계정으로 한 번 로그인하면 해당 계정의 지출 기록만 조회해. 90 Day 로그인과는 별도로 보관돼.</p><input aria-label="Spend Flow 이메일" type="email" required autoComplete="username" placeholder="Spend Flow 이메일" value={login.email} onChange={e=>setLogin(x=>({...x,email:e.target.value}))}/><input aria-label="Spend Flow 비밀번호" type="password" required autoComplete="current-password" placeholder="비밀번호" value={login.password} onChange={e=>setLogin(x=>({...x,password:e.target.value}))}/><button disabled={busy} type="submit"><LogIn size={15}/> Spend Flow 연결</button></form>:<>
      <div className="sf-link-session"><span>{session.user.email} · {updated?'최근 조회 '+updated:'불러오는 중'}</span><button type="button" onClick={()=>spend.auth.signOut()}><LogOut size={14}/> 연결 해제</button></div>
      {stats?<><div className="sf-kpi-grid">{targets.map(t=>{const pct=t.value==null?0:Math.max(0,Math.min(100,t.value/t.goal*100));return <div className="sf-kpi" key={t.key}><div className="sf-kpi-label"><t.icon size={15}/><span>{t.name}</span><button type="button" className="sf-star" aria-label={featured.includes(t.key)?`${t.name} 대표 KPI 해제`:`${t.name} 대표 KPI 지정`} title="바깥 카드에 표시 (최대 2개)" aria-pressed={featured.includes(t.key)} onClick={()=>onToggleFeatured?.(t.key)}><Star size={19} fill={featured.includes(t.key)?"#9873c8":"none"} color={featured.includes(t.key)?"#9873c8":"#aaa0b3"}/></button></div><strong>{t.display}</strong><small>목표 {t.goal.toLocaleString('ko-KR')}{t.unit}</small><div className="sf-progress"><i style={{width:pct+'%'}}/></div><p>{t.note}</p></div>})}</div><p className="sf-footnote">{stats.days}일 경과 기준 · 예산 잔액은 실제 저축액이 아니며 기간 중 추정치야. 소비 기록이 빠진 날도 무지출로 계산되니 기록의 완전성을 확인해 줘.</p></>:<p className="sf-notice">{busy?'Spend Flow 데이터를 불러오는 중…':'조회된 데이터가 없어.'}</p>}
    </>}{error&&<p className="sf-error" role="alert">{error}</p>}
  </section>
}
