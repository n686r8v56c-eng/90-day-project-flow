import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Star,RefreshCw,LogIn,LogOut} from 'lucide-react';
import './FashionFlowKpi.css';

const url=import.meta.env.VITE_COSMETIC_SUPABASE_URL||'https://icdfblosbrqlvfocungu.supabase.co';
const key=import.meta.env.VITE_COSMETIC_SUPABASE_ANON_KEY||'sb_publishable_NsPnBTYKgZvTcpmLmhfXkg_9petD1EA';
export const cosmetic=url&&key?createClient(url,key,{auth:{storageKey:'90day-cosmetic-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export const cosmeticMetrics=[
 {id:'inventory',name:'보유 화장품',unit:'개'},
 {id:'actual',name:'메이크업 기록',unit:'건'},
 {id:'looks',name:'잇걸룩 수',unit:'개'},
 {id:'completion',name:'실현 완료율',unit:'%'}
];
const list=v=>Array.isArray(v)?v:[];
export const countCosmeticKpis=payload=>{
 const inventory=list(payload?.inventory),styles=list(payload?.styles),records=list(payload?.records);
 const completed=styles.filter(x=>!!x.proofImage);
 const actual=list(payload?.cosmeticActual).length+completed.length+records.filter(x=>x.image&&['replay','experiment'].includes(x.kind)).length;
 return {inventory:inventory.length,actual,looks:styles.length,completion:styles.length?Math.round(completed.length/styles.length*100):0};
};
const empty={inventory:0,actual:0,looks:0,completion:0};
function useCosmeticStats(){
 const [session,setSession]=useState(null),[stats,setStats]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=useCallback(async current=>{
  if(!cosmetic||!current?.user?.id){setStats(null);setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const {data,error}=await cosmetic.from('makeup_flow_data').select('payload').eq('user_id',current.user.id).maybeSingle();
   if(error)throw error;
   setStats(data?.payload?countCosmeticKpis(data.payload):null);
  }catch(e){setStats(null);setError(e?.message||'Cosmetic Flow 기록 조회 실패');}finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  if(!cosmetic){setLoading(false);return;}
  let active=true;
  cosmetic.auth.getSession().then(({data,error})=>{if(active){setSession(data?.session||null);if(error)setError(error.message);refresh(data?.session)}}).catch(e=>{if(active){setError(e.message);setLoading(false)}});
  const {data:{subscription}}=cosmetic.auth.onAuthStateChange((_event,next)=>{if(active){setSession(next);refresh(next)}});
  const onResume=()=>{if(document.visibilityState==='visible')cosmetic.auth.getSession().then(({data})=>{if(active)refresh(data?.session)})};
  document.addEventListener('visibilitychange',onResume);window.addEventListener('focus',onResume);
  return()=>{active=false;subscription.unsubscribe();document.removeEventListener('visibilitychange',onResume);window.removeEventListener('focus',onResume)};
 },[refresh]);
 return {session,stats,loading,error,refresh:()=>refresh(session)};
}
export function CosmeticKpiCard({featured=[]}){
 const {session,stats,loading,error}=useCosmeticStats();
 if(!cosmetic)return <div className="kpi-empty">Cosmetic Flow 설정 필요</div>;
 if(!session)return <div className="kpi-empty">Cosmetic Flow 연결하기</div>;
 if(loading&&!stats)return <div className="kpi-empty">Cosmetic Flow 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Cosmetic Flow 조회 오류</div>;
 if(!stats)return <div className="kpi-empty">Cosmetic Flow 저장 기록 없음</div>;
 const selected=featured.filter(id=>cosmeticMetrics.some(m=>m.id===id)).slice(0,2);
 if(!selected.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
 return <>{selected.map(id=>{const metric=cosmeticMetrics.find(x=>x.id===id);return <div className="kpi-preview" key={id}><small>{metric.name}</small><strong>{stats[id].toLocaleString('ko-KR')}{metric.unit==='%'?'%':' '+metric.unit}</strong><span>Cosmetic Flow 연동</span></div>})}</>;
}
export default function CosmeticFlowKpi({featured=[],onToggleFeatured}){
 const {session,stats,loading,error,refresh}=useCosmeticStats();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
 const login=async e=>{e.preventDefault();if(!cosmetic)return;setBusy(true);setAuthError('');try{const {error}=await cosmetic.auth.signInWithPassword({email,password});if(error)setAuthError(error.message)}catch(e){setAuthError(e.message||'로그인 오류')}finally{setPassword('');setBusy(false)}};
 const shown=useMemo(()=>stats||empty,[stats]);
 return <section className="fk-panel">
 <div className="fk-head"><div><strong>Cosmetic Flow · KPI 연동</strong><small>화장품 · 실제 메이크업 · 잇걸룩 · 실현 완료율</small></div>{session&&<button type="button" onClick={refresh} title="새로고침" aria-label="새로고침"><RefreshCw size={17}/></button>}</div>
 {!cosmetic?<p className="fk-error">Cosmetic Flow 연결 설정을 확인해 줘.</p>:!session?<form className="fk-login" onSubmit={login}><p>Cosmetic Flow 계정으로 로그인하거나, 연동 계정 관리에서 한 번에 연결해 줘.</p><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Cosmetic Flow 이메일" autoComplete="username"/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password"/><button type="submit" disabled={busy}><LogIn size={15}/>{busy?'연결 중…':'Cosmetic Flow 연결'}</button></form>:<>
  <div className="fk-session"><span>Cosmetic Flow 연결됨</span><button type="button" onClick={()=>cosmetic.auth.signOut()}><LogOut size={14}/> 연결 해제</button></div>
  {loading&&!stats?<p className="fk-notice">기록 불러오는 중…</p>:stats?<div className="fk-grid">{cosmeticMetrics.map(m=><div className="fk-metric" key={m.id}><div className="fk-metric-title"><span>{m.name}</span><button type="button" aria-label={m.name+(featured.includes(m.id)?' 대표 KPI 해제':' 대표 KPI 설정')} aria-pressed={featured.includes(m.id)} onClick={()=>onToggleFeatured?.(m.id)} title="카드에 표시할 대표 KPI 최대 2개"><Star size={18} color={featured.includes(m.id)?'#9470c5':'#b2a7ba'} fill={featured.includes(m.id)?'#9470c5':'none'}/></button></div><strong>{shown[m.id].toLocaleString('ko-KR')} <small>{m.unit}</small></strong><small>Cosmetic Flow 자동 조회</small></div>)}</div>:<p className="fk-notice">Cosmetic Flow에 저장된 데이터가 없어.</p>}
 </>}
 {error&&<p role="alert" className="fk-error">기록 조회 오류: {error}</p>}{authError&&<p role="alert" className="fk-error">{authError}</p>}
 <p className="fk-notice">Cosmetic Flow 홈과 같은 계산 기준. 원본 데이터는 변경하지 않아.</p>
 </section>;
}
