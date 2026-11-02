import React,{useEffect,useState,useMemo} from 'react';
import {createClient} from '@supabase/supabase-js';
import {RefreshCw,LogIn,LogOut,Star} from 'lucide-react';
import './CareLogKpi.css';
export const care=createClient(import.meta.env.VITE_CARE_SUPABASE_URL||'https://sqqxgjlgmuolghcemjii.supabase.co',import.meta.env.VITE_CARE_SUPABASE_ANON_KEY||'sb_publishable_8qBLYWxO5nVlXUPqqAo7UQ_dNgaWq27',{auth:{storageKey:'ninety-day-care-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dayOf=iso=>{const d=new Date(iso);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const specs=[['water','물','mL'],['steps','만보','보'],['sleep','수면','시간'],['protein_g','단백질','g'],['carbs_g','탄수화물','g'],['fat_g','지방','g'],['calories','총칼로리','kcal']];
const num=x=>Number(x)||0,fmt=x=>Number(x).toLocaleString('ko-KR',{maximumFractionDigits:1});
const compute=rows=>{const day=(rows.diet_days||[]).find(x=>x.day===today());const g={water_cups:20,cup_ml:250,protein_g:100,carbs_g:150,fat_g:50,calories:1400,...(rows.user_goals||[])[0]};
 const sleep=(rows.sleep_logs||[]).filter(x=>x.woke_at&&dayOf(x.woke_at)===today()),slept=sleep.reduce((sum,x)=>sum+Math.max(0,(Date.parse(x.woke_at)-Date.parse(x.slept_at))/3600000||0),0);
 return specs.map(([id,name,unit])=>{let goal,actual;
 if(id==='water'){goal=num(g.water_cups)*num(g.cup_ml);actual=day?num(day.water_cups)*num(g.cup_ml):null;}
 else if(id==='steps'){goal=10000;actual=day?.step_count!=null?num(day.step_count):null;}
 else if(id==='sleep'){goal=8;actual=sleep.length?slept:null;}
 else{goal=num(g[id]);actual=day?.nutrition_updated_at?num(day[id]):null;}
 return {id,name,unit,goal,actual};});};
function useCare(){
 const [session,setSession]=useState(null),[rows,setRows]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=async s=>{if(!s?.user?.id){setRows(null);setLoading(false);return;}setLoading(true);setError('');
 const names=['diet_days','user_goals','sleep_logs'];const results=await Promise.all(names.map(n=>care.from(n).select('*').eq('user_id',s.user.id).limit(2000)));
 const e=results.find(x=>x.error)?.error;
 if(e){setError(e.message);setRows(null);}else setRows(Object.fromEntries(names.map((n,i)=>[n,results[i].data||[]])));setLoading(false);};
 useEffect(()=>{let live=true;care.auth.getSession().then(({data})=>{if(live){setSession(data.session);refresh(data.session)}});
 const {data:{subscription}}=care.auth.onAuthStateChange((_event,s)=>{if(live){setSession(s);refresh(s)}});
 const onFocus=()=>{if(document.visibilityState==='visible')care.auth.getSession().then(({data})=>{if(live)refresh(data.session)})};
 window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);
 return()=>{live=false;subscription.unsubscribe();window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus)};},[]);
 return {session,rows,loading,error,refresh:()=>refresh(session)};
}
export function CareKpiCard({featured=[]}){
 const {session,rows,loading,error}=useCare();
 const data=useMemo(()=>rows?compute(rows):[],[rows]);
 if(!featured.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
 if(!session)return <div className="kpi-empty">Care Log 계정 연결하기</div>;
 if(loading)return <div className="kpi-empty">Care Log 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Care Log 조회 오류</div>;
 return <>{featured.map(id=>data.find(x=>x.id===id)).filter(Boolean).slice(0,2).map(x=><div className="kpi-preview" key={x.id}><small>{x.name}</small><strong>{x.actual===null?'미기록':fmt(x.actual)+' '+x.unit}</strong><span>목표 {fmt(x.goal)} {x.unit}</span>{x.actual!==null&&x.goal>0&&<div className="mini"><div style={{width:Math.min(100,x.actual/x.goal*100)+'%'}}/></div>}</div>)}</>;
}
export default function CareLogKpi({featured=[],onToggleFeatured}){
 const {session,rows,loading,error,refresh}=useCare();
 const data=useMemo(()=>rows?compute(rows):[],[rows]);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[loginError,setLoginError]=useState('');
 const login=async e=>{e.preventDefault();setBusy(true);setLoginError('');const {error}=await care.auth.signInWithPassword({email,password});setPassword('');setBusy(false);if(error)setLoginError(error.message)};
 return <section className="care-kpi-panel">
 <div className="care-kpi-heading"><div><strong>Care Log · 오늘의 관리</strong><small>실제 / 목표 · 읽기 전용</small></div>{session&&<button type="button" onClick={refresh} aria-label="새로고침"><RefreshCw size={18}/></button>}</div>
 {!session?<form className="care-kpi-login" onSubmit={login}><p>Care Log 계정으로 로그인하면 오늘의 기록을 가져와.</p><input type="email" required placeholder="Care Log 이메일" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" required placeholder="비밀번호" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/><button type="submit" disabled={busy}><LogIn size={16}/>{busy?'연결 중…':'Care Log 연결'}</button></form>:
 <><div className="care-kpi-session"><span>Care Log 연결됨</span><button type="button" onClick={()=>care.auth.signOut()}><LogOut size={16}/> 연결 해제</button></div>{loading?<p>기록 불러오는 중…</p>:<div className="care-kpi-grid">{data.map(x=><div className="care-kpi-metric" key={x.id}>
 <div className="care-kpi-metric-title"><span>{x.name}</span><button type="button" aria-label={x.name+(featured.includes(x.id)?' 대표 KPI 해제':' 대표 KPI 선택')} aria-pressed={featured.includes(x.id)} onClick={()=>onToggleFeatured?.(x.id)}><Star size={19} fill={featured.includes(x.id)?'#9873c8':'none'} color={featured.includes(x.id)?'#9873c8':'#aaa0b3'}/></button></div>
 <strong>{x.actual===null?'미기록':fmt(x.actual)}{x.actual===null?'':' '+x.unit} <small>/ 목표 {fmt(x.goal)} {x.unit}</small></strong>
 {x.actual!==null&&x.goal>0&&<><span>오늘 달성률 {Math.round(x.actual/x.goal*100)}%</span><div className="care-kpi-track"><i style={{width:Math.min(100,x.actual/x.goal*100)+'%'}}/></div></>}</div>)}</div>}</>}
 {(error||loginError)&&<p className="care-kpi-error" role="alert">{error||loginError}</p>}
 </section>;
}