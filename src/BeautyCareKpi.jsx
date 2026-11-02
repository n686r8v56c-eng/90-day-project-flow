import React,{useEffect,useMemo,useState,useCallback} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Star,RefreshCw,LogOut,LogIn} from 'lucide-react';
import './BeautyCareKpi.css';
const url=import.meta.env.VITE_BEAUTY_SUPABASE_URL;
const key=import.meta.env.VITE_BEAUTY_SUPABASE_ANON_KEY;
export const beauty=url&&key?createClient(url,key,{auth:{storageKey:'90day-beauty-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const dayKey=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const since7=()=>{const d=new Date();d.setDate(d.getDate()-6);return dayKey(d);};
const metrics=[
 {id:'face',name:'얼굴 관리율',unit:'%',period:'오늘'},
 {id:'hair',name:'헤어 관리율',unit:'%',period:'오늘'},
 {id:'input',name:'기록 입력률',unit:'%',period:'오늘'},
 {id:'gym',name:'헬스장 출석',unit:'회',period:'최근 7일'},
 {id:'strength',name:'근력운동',unit:'분',period:'최근 7일'},
 {id:'stretch',name:'스트레칭',unit:'분',period:'최근 7일'},
 {id:'massage',name:'마사지',unit:'분',period:'최근 7일'},
 {id:'waist',name:'허리',unit:'cm',period:'최근 측정'},
 {id:'thigh',name:'허벅지',unit:'cm',period:'최근 측정'},
 {id:'calf',name:'종아리',unit:'cm',period:'최근 측정'}
];
const fmt=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:1});
const beautyIds=new Set(['face','hair','input']);
const bodyIds=new Set(['gym','strength','stretch','massage','waist','thigh','calf']);
const visibleFor=(all,project)=>all.filter(m=>(project==='body'?bodyIds:beautyIds).has(m.id));
function valuesFor(data){
 const today=dayKey(),week=since7(),items=(data.items||[]).filter(x=>!x.archived);
 const row=(data.days||[]).find(x=>x.record_date===today);
 const face=items.filter(x=>x.category==='face'&&x.kind==='check');
 const hair=items.filter(x=>x.category==='hair'&&x.kind==='check');
 const ratings=items.filter(x=>x.kind==='rating'&&(x.category==='face'||x.category==='hair'));
 const faceRate=face.length?Math.round(face.filter(x=>row?.checks?.[x.id]===true).length/face.length*100):null;
 const hairRate=hair.length?Math.round(hair.filter(x=>row?.checks?.[x.id]===true).length/hair.length*100):null;
 const inputRate=ratings.length?Math.round(ratings.filter(x=>row?.ratings?.[x.id]!=null).length/ratings.length*100):null;
 const weekDays=(data.days||[]).filter(x=>x.record_date>=week&&x.record_date<=today);
 const gymDates=new Set((data.photos||[]).filter(x=>x.category==='gym'&&x.record_date>=week&&x.record_date<=today).map(x=>x.record_date));
 const minutes=id=>weekDays.reduce((total,x)=>total+(x.measurements?.['workout_'+id+'_done']?Math.max(0,Number(x.measurements?.['workout_'+id])||0):0),0);
 const latest=id=>{const r=[...(data.days||[])].sort((a,b)=>b.record_date.localeCompare(a.record_date)).find(x=>x.measurements?.[id]!==null&&x.measurements?.[id]!==undefined&&x.measurements?.[id]!==''&&Number.isFinite(Number(x.measurements[id])));return r?{value:Number(r.measurements[id]),date:r.record_date}:null};
 return metrics.map(m=>{let actual=null,target=null,detail=m.period;
 if(m.id==='face'){actual=faceRate;target=100;}
 if(m.id==='hair'){actual=hairRate;target=100;}
 if(m.id==='input'){actual=inputRate;target=100;}
 if(m.id==='gym'){actual=gymDates.size;target=null;}
 if(['strength','stretch','massage'].includes(m.id)){actual=minutes(m.id);target=null;}
 if(['waist','thigh','calf'].includes(m.id)){const last=latest(m.id);actual=last?.value??null;detail=last?last.date:'미기록';}
 return {...m,actual,target,detail};});
}
function useBeauty(){
 const [session,setSession]=useState(null),[records,setRecords]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=useCallback(async s=>{
  if(!beauty||!s?.user?.id){setRecords(null);setLoading(false);return;}
  setLoading(true);setError('');
  const names=['beauty_items','beauty_daily','beauty_photos'];
  const reads=await Promise.all(names.map(n=>beauty.from(n).select('*').eq('user_id',s.user.id).limit(5000)));
  const failure=reads.find(x=>x.error)?.error;
  if(failure){setError(failure.message);setRecords(null);}else setRecords({items:reads[0].data||[],days:reads[1].data||[],photos:reads[2].data||[]});
  setLoading(false);
 },[]);
 useEffect(()=>{
  if(!beauty){setLoading(false);return;}
  let active=true;
  beauty.auth.getSession().then(({data})=>{if(active){setSession(data.session);refresh(data.session)}});
  const {data:{subscription}}=beauty.auth.onAuthStateChange((_event,s)=>{if(active){setSession(s);refresh(s)}});
  const onResume=()=>{if(document.visibilityState==='visible')beauty.auth.getSession().then(({data})=>{if(active)refresh(data.session)})};
  window.addEventListener('focus',onResume);document.addEventListener('visibilitychange',onResume);
  return()=>{active=false;subscription.unsubscribe();window.removeEventListener('focus',onResume);document.removeEventListener('visibilitychange',onResume);};
 },[refresh]);
 return {session,records,loading,error,refresh:()=>refresh(session)};
}
export function BeautyCareKpiCard({featured=[],project='beauty'}){
 const {session,records,loading,error}=useBeauty();
 const values=useMemo(()=>records?visibleFor(valuesFor(records),project):[],[records,project]);
 if(!featured.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
 if(!beauty)return <div className="kpi-empty">Beauty Care 연결 설정 필요</div>;
 if(!session)return <div className="kpi-empty">Beauty Care 계정 연결하기</div>;
 if(loading)return <div className="kpi-empty">Beauty Care 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Beauty Care 조회 오류</div>;
 return <>{featured.map(id=>values.find(v=>v.id===id)).filter(Boolean).slice(0,2).map(m=><div className="kpi-preview" key={m.id}><small>{m.name} · {m.period}</small><strong>{m.actual==null?'미기록':fmt(m.actual)+' '+m.unit}</strong><span>{m.target!==null?'목표 '+m.target+m.unit:m.detail}</span></div>)}</>;
}
export default function BeautyCareKpi({featured=[],onToggleFeatured,project='beauty'}){
 const {session,records,loading,error,refresh}=useBeauty();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
 const values=useMemo(()=>records?visibleFor(valuesFor(records),project):[],[records,project]);
 const signIn=async e=>{e.preventDefault();setBusy(true);setAuthError('');const{error}=await beauty.auth.signInWithPassword({email,password});setPassword('');setBusy(false);if(error)setAuthError(error.message);};
 return <section className="beauty-kpi-panel"><div className="beauty-kpi-head"><div><strong>{project==='body'?'Body · 운동과 신체 측정':'Beauty · 얼굴 관리 기록'}</strong><small>{project==='body'?'최근 7일 운동 · 최신 바디 측정':'오늘의 얼굴·헤어 관리율 · 기록 입력률'}</small></div>{session&&<button type="button" onClick={refresh} aria-label="새로고침"><RefreshCw size={18}/></button>}</div>
 {!beauty?<p className="beauty-kpi-error">Cloudflare Pages에 VITE_BEAUTY_SUPABASE_URL, VITE_BEAUTY_SUPABASE_ANON_KEY를 설정해 줘.</p>:!session?<form className="beauty-kpi-login" onSubmit={signIn}><p>Beauty Care Flow 계정으로 로그인해 줘.</p><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Beauty Care 이메일" autoComplete="username"/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password"/><button type="submit" disabled={busy}><LogIn size={16}/>{busy?'연결 중…':'Beauty Care 연결'}</button></form>:
 <><div className="beauty-kpi-session"><span>Beauty Care 연결됨</span><button type="button" onClick={()=>beauty.auth.signOut()}><LogOut size={15}/> 연결 해제</button></div>{loading?<p>기록을 불러오는 중…</p>:<div className="beauty-kpi-grid">{values.map(m=><div className="beauty-kpi-metric" key={m.id}><div className="beauty-kpi-row"><span>{m.name}</span><button type="button" aria-label={m.name+(featured.includes(m.id)?' 대표 KPI 해제':' 대표 KPI 선택')} aria-pressed={featured.includes(m.id)} title="대표 KPI 최대 2개" onClick={()=>onToggleFeatured?.(m.id)}><Star size={19} fill={featured.includes(m.id)?'#9873c8':'none'} color={featured.includes(m.id)?'#9873c8':'#aaa0b3'}/></button></div><strong>{m.actual==null?'미기록':fmt(m.actual)+' '+m.unit}</strong><small>{m.target!==null?'목표 '+fmt(m.target)+m.unit:m.detail}</small>{m.target!=null&&m.actual!=null&&<div className="beauty-kpi-track"><i style={{width:Math.min(100,m.actual/m.target*100)+'%'}}/></div>}</div>)}</div>}</>}
 {(error||authError)&&<p className="beauty-kpi-error" role="alert">{error||authError}</p>}
 </section>;
}
