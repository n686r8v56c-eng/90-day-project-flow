import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {RefreshCw,Star} from 'lucide-react';
import {beauty} from './BeautyCareKpi.jsx';
import './CareLogKpi.css';

// Care now reads the Diet tab in Beauty Care Flow, not the former Care Log project.
const dayKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const specs=[['water','물','mL'],['steps','만보','보'],['sleep','수면','시간'],['protein_g','단백질','g'],['carbs_g','탄수화물','g'],['fat_g','지방','g'],['calories','총칼로리','kcal']];
const fallbackGoals={water_cups:20,cup_ml:250,calories:1400,protein_g:100,carbs_g:150,fat_g:50};
const num=x=>Number(x)||0;
const fmt=x=>Number(x).toLocaleString('ko-KR',{maximumFractionDigits:1});
export const computeBeautyCareDietKpis=(rows,at=dayKey())=>{
 const day=(rows?.days||[]).find(x=>x.record_date===at);
 const goals={...fallbackGoals,...(rows?.goals||{})};
 const sleep=day?.sleep_start&&day?.sleep_end?Math.max(0,(Date.parse(day.sleep_end)-Date.parse(day.sleep_start))/3600000):null;
 return specs.map(([id,name,unit])=>{
  let actual=null,goal=null;
  if(id==='water'){goal=num(goals.water_cups)*num(goals.cup_ml);actual=day?num(day.water_cups)*num(goals.cup_ml):null;}
  else if(id==='steps'){goal=10000;actual=day?.step_count!=null?num(day.step_count):null;}
  else if(id==='sleep'){goal=8;actual=Number.isFinite(sleep)?sleep:null;}
  else{goal=num(goals[id]);actual=day?.nutrition_updated_at&&day?.[id]!=null?num(day[id]):null;}
  return {id,name,unit,goal,actual};
 });
};
function useCareDiet(){
 const [session,setSession]=useState(null),[rows,setRows]=useState(null),[loading,setLoading]=useState(!!beauty),[error,setError]=useState('');
 const refresh=useCallback(async s=>{
  if(!beauty||!s?.user?.id){setRows(null);setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [days,goals]=await Promise.all([
    beauty.from('beauty_diet_days').select('*').eq('user_id',s.user.id).gte('record_date',dayKey()).lte('record_date',dayKey()),
    beauty.from('beauty_diet_goals').select('*').eq('user_id',s.user.id).maybeSingle()
   ]);
   if(days.error||goals.error)throw days.error||goals.error;
   setRows({days:days.data||[],goals:goals.data||{}});
  }catch(e){setRows(null);setError(e?.message||'Beauty Care 식단 조회 오류');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  if(!beauty){setLoading(false);return;}
  let alive=true;
  beauty.auth.getSession().then(({data,error})=>{if(alive){setSession(data?.session||null);if(error)setError(error.message);refresh(data?.session)}}).catch(e=>{if(alive){setError(e.message);setLoading(false)}});
  const {data:{subscription}}=beauty.auth.onAuthStateChange((_event,s)=>{if(alive){setSession(s);refresh(s)}});
  const onResume=()=>{if(document.visibilityState==='visible')beauty.auth.getSession().then(({data})=>{if(alive)refresh(data?.session)})};
  document.addEventListener('visibilitychange',onResume);window.addEventListener('focus',onResume);
  return()=>{alive=false;subscription.unsubscribe();document.removeEventListener('visibilitychange',onResume);window.removeEventListener('focus',onResume);};
 },[refresh]);
 return {session,rows,loading,error,refresh:()=>refresh(session)};
}
export function CareDietKpiCard({featured=[]}){
 const {session,rows,loading,error}=useCareDiet();
 const data=useMemo(()=>rows?computeBeautyCareDietKpis(rows):[],[rows]);
 if(!featured.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
 if(!beauty)return <div className="kpi-empty">Beauty Care 연결 설정 필요</div>;
 if(!session)return <div className="kpi-empty">Beauty Care 계정 연결하기</div>;
 if(loading)return <div className="kpi-empty">Beauty Care 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Beauty Care 식단 조회 오류</div>;
 return <>{featured.map(id=>data.find(x=>x.id===id)).filter(Boolean).slice(0,2).map(x=><div className="kpi-preview" key={x.id}><small>{x.name}</small><strong>{x.actual===null?'미기록':fmt(x.actual)+' '+x.unit}</strong><span>목표 {fmt(x.goal)} {x.unit}</span>{x.actual!==null&&x.goal>0&&<div className="mini"><div style={{width:Math.min(100,x.actual/x.goal*100)+'%'}}/></div>}</div>)}</>;
}
export default function BeautyCareDietKpi({featured=[],onToggleFeatured}){
 const {session,rows,loading,error,refresh}=useCareDiet();
 const data=useMemo(()=>rows?computeBeautyCareDietKpis(rows):[],[rows]);
 return <section className="care-kpi-panel">
 <div className="care-kpi-heading"><div><strong>Care · Beauty Care 식단</strong><small>오늘 실제 / 목표 · Beauty Care 자동 연동</small></div>{session&&<button type="button" onClick={refresh} aria-label="새로고침"><RefreshCw size={18}/></button>}</div>
 {!beauty?<p className="care-kpi-error">Beauty Care Supabase 연결 설정이 필요해.</p>:!session?<p>연동 계정 관리에서 Beauty Care 계정을 연결해 줘.</p>:<><div className="care-kpi-session"><span>Beauty Care 연결됨</span></div>{loading?<p>기록 불러오는 중…</p>:error?<p className="care-kpi-error" role="alert">{error}</p>:<div className="care-kpi-grid">{data.map(x=><div className="care-kpi-metric" key={x.id}>
 <div className="care-kpi-metric-title"><span>{x.name}</span><button type="button" aria-label={x.name+(featured.includes(x.id)?' 대표 KPI 해제':' 대표 KPI 선택')} aria-pressed={featured.includes(x.id)} onClick={()=>onToggleFeatured?.(x.id)}><Star size={19} fill={featured.includes(x.id)?'#9873c8':'none'} color={featured.includes(x.id)?'#9873c8':'#aaa0b3'}/></button></div>
 <strong>{x.actual===null?'미기록':fmt(x.actual)}{x.actual===null?'':' '+x.unit} <small>/ 목표 {fmt(x.goal)} {x.unit}</small></strong>
 {x.actual!==null&&x.goal>0&&<><span>오늘 달성률 {Math.round(x.actual/x.goal*100)}%</span><div className="care-kpi-track"><i style={{width:Math.min(100,x.actual/x.goal*100)+'%'}}/></div></>}</div>)}</div>}</>}
 </section>;
}
