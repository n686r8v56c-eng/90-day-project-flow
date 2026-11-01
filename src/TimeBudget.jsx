import React,{useMemo,useState} from 'react';
import {Plus,Trash2,Settings2,RefreshCw,LogIn,LogOut} from 'lucide-react';
import {useFocusTime} from './useFocusTime.js';
import './TimeBudget.css';

const dayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const minutesText=n=>{const rounded=Math.max(0,Math.round(n||0));return `${Math.floor(rounded/60)}시간 ${rounded%60}분`};
const num=n=>Number.isFinite(n)?n:0;
const limitMinutes=v=>Math.max(0,Math.min(1440,Math.round(Number(v)||0)));
const byDay=(logs,active,date)=>{
 const now=Date.now();const start=new Date(date+'T00:00:00').getTime();const end=new Date(date+'T00:00:00');end.setDate(end.getDate()+1);const until=end.getTime();
 const list=[...logs,...(active?.start?[{activity:active.activity,start:active.start,end:new Date(now).toISOString()}]:[])];
 const totals={};
 for(const entry of list){const a=Date.parse(entry.start),b=Date.parse(entry.end);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||!entry.activity)continue;
  const ms=Math.max(0,Math.min(b,until)-Math.max(a,start));if(ms)totals[entry.activity]=(totals[entry.activity]||0)+ms;
 }
 return Object.fromEntries(Object.entries(totals).map(([k,ms])=>[k,Math.round(ms/60000)]));
};
export default function TimeBudget({value,onChange}){
 const cfg=value||{};
 const focus=useFocusTime();
 const [date,setDate]=useState(dayKey());
 const [settings,setSettings]=useState(false);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [name,setName]=useState('');
 const [hours,setHours]=useState('1');
 const [minutes,setMinutes]=useState('0');
 const saved=cfg.activities||[];
 const linked=focus.ready;
 const activityNames=linked?focus.activities:[];
 // Preserve manually entered budgets and match existing names instead of duplicating.
 const entries=linked
   ?[...activityNames.map(n=>saved.find(x=>x.name===n)||{id:`focus:${n}`,name:n,minutes:0}),...saved.filter(x=>!activityNames.includes(x.name))]
   :saved;
 const overrides=cfg.overrides?.[date]||{};
 const budget=a=>overrides[a.id]??a.minutes??0;
 const total=entries.reduce((n,x)=>n+budget(x),0);
 const actual=useMemo(()=>byDay(focus.logs||[],focus.active,date),[focus.logs,focus.active,date]);
 const actualTotal=entries.reduce((n,x)=>n+(actual[x.name]||0),0);
 const patch=fn=>onChange(fn(cfg));
 const add=()=>{const title=name.trim();if(!title||saved.some(x=>x.name===title))return;patch(c=>({...c,activities:[...(c.activities||[]),{id:crypto.randomUUID(),name:title,minutes:limitMinutes(Number(hours||0)*60+Number(minutes||0))}]}));setName('')};
 const updateMinutes=(a,v,forDay=false)=>patch(c=>{
  const have=(c.activities||[]).some(x=>x.id===a.id);
  const base=have?(c.activities||[]):[...(c.activities||[]),{...a,minutes:0}];
  return forDay
   ?{...c,activities:base,overrides:{...(c.overrides||{}),[date]:{...(c.overrides?.[date]||{}),[a.id]:limitMinutes(v)}}}
   :{...c,activities:base.map(x=>x.id===a.id?{...x,minutes:limitMinutes(v)}:x)};
 });
 const remove=a=>{if(!window.confirm('이 활동의 시간 예산을 삭제할까요?'))return;
  patch(c=>({...c,activities:(c.activities||[]).filter(x=>x.id!==a.id)}));
 };
 const login=async(e)=>{e.preventDefault();const ok=await focus.signIn(email,password);if(ok){setPassword('');}};
 return <section className="tb-root">
  <div className="tb-heading"><div><h3>일일 시간 예산</h3><p>Focus Flow 활동별로 하루 목표 시간과 실제 사용 시간을 비교해요.</p></div><button type="button" className="tb-settings" onClick={()=>setSettings(x=>!x)}><Settings2 size={17}/> {settings?'현황 보기':'시간 예산 설정'}</button></div>
  <div className="tb-date"><label>조회 날짜 <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><strong>배정 합계 {minutesText(total)}</strong></div>
  {!focus.session?<div className="tb-bridge-box"><strong>Focus Flow 연결</strong><p>활동 목록과 타임로그를 자동으로 불러오려면 Focus Flow 계정으로 한 번 로그인해 줘. 90 Day 로그인과는 별도로 인증돼.</p><form className="tb-bridge-login" onSubmit={login}><input type="email" autoComplete="username" placeholder="Focus Flow 이메일" required value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" autoComplete="current-password" placeholder="Focus Flow 비밀번호" required value={password} onChange={e=>setPassword(e.target.value)}/><button type="submit" disabled={focus.busy||focus.loading}><LogIn size={15}/> {focus.busy?'로그인 중…':'Focus Flow 연결'}</button></form></div>
  :<div className="tb-bridge-connected"><span>Focus Flow {linked?'연결됨':'연결 중…'} · {linked?`${activityNames.length}개 활동`:'기록 불러오는 중'}</span><div><button type="button" disabled={focus.busy} onClick={focus.refresh} title="기록 새로고침"><RefreshCw size={16}/> 새로고침</button><button type="button" onClick={focus.signOut} title="연결 해제"><LogOut size={16}/> 해제</button></div></div>}
  {focus.error&&<p className="tb-bridge-error" role="alert">{focus.error}</p>}
  {linked&&<div className="tb-summary"><div><small>오늘의 목표</small><strong>{minutesText(total)}</strong></div><div><small>선택일 사용</small><strong>{minutesText(actualTotal)}</strong></div><div><small>시간 차이</small><strong>{actualTotal>total?`+${minutesText(actualTotal-total)} 초과`:`${minutesText(total-actualTotal)} 남음`}</strong></div></div>}
  {entries.length===0&&!settings&&<p className="tb-empty">활동이 없어요. Focus Flow를 연결하거나 시간 예산 설정에서 추가해 줘.</p>}
  {entries.map(a=>{const used=actual[a.name]||0,goal=budget(a);return <div className="tb-activity" key={a.id}><div className="tb-activity-title"><strong>{a.name}</strong>{settings&&saved.some(x=>x.id===a.id)&&<button type="button" aria-label={`${a.name} 목표 삭제`} onClick={()=>remove(a)}><Trash2 size={16}/></button>}</div><div className="tb-budget-row"><span>하루 목표</span>{settings?<div className="tb-edit-minutes"><input aria-label={`${a.name} 기본 목표 시간`} type="number" min="0" max="24" step="0.5" value={(a.minutes||0)/60} onChange={e=>updateMinutes(a,Number(e.target.value)*60)}/> 시간</div>:<strong>{minutesText(goal)}</strong>}</div>{settings&&<div className="tb-budget-row"><span>{date}만 변경</span><div className="tb-edit-minutes"><input aria-label={`${a.name} 해당 날짜 목표 시간`} type="number" min="0" max="24" step="0.5" value={goal/60} onChange={e=>updateMinutes(a,Number(e.target.value)*60,true)}/> 시간</div></div>}<div className="tb-budget-row"><span>실제 사용</span>{linked?<strong>{minutesText(used)} {used>goal?<em className="tb-over">(+{minutesText(used-goal)} 초과)</em>:null}</strong>:<span className="tb-unlinked">연동 대기</span>}</div>{linked&&<div className="tb-progress"><div className={used>goal?'over':''} style={{width:`${goal?Math.min(100,used/goal*100):used>0?100:0}%`}}/></div>}</div>})}
  {settings&&<div className="tb-add"><h4>활동 직접 추가</h4><p>Focus Flow 활동은 자동 표시돼. 필요한 경우에만 직접 추가해 줘.</p><input placeholder="활동 이름" value={name} onChange={e=>setName(e.target.value)}/><div className="tb-add-controls"><label>시간 <input type="number" min="0" max="24" value={hours} onChange={e=>setHours(e.target.value)}/></label><label>분 <input type="number" min="0" max="59" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><button type="button" onClick={add} disabled={!name.trim()||entries.some(a=>a.name===name.trim())}><Plus size={16}/> 추가</button></div></div>}
  <p className="tb-foot">기본 목표는 매일 적용돼. 특정 날짜의 목표 수정은 그 날짜에만 적용돼. Focus Flow의 기록은 조회만 하고 수정하지 않아.</p>
 </section>
}
