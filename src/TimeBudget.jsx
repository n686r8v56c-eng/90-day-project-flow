import React,{useState} from 'react';
import {Plus,Trash2,Settings2,Check} from 'lucide-react';
import './TimeBudget.css';
const dayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const minutesText=n=>`${Math.floor(n/60)}시간 ${n%60}분`;
export default function TimeBudget({value,onChange}){
 const cfg=value||{};
 const [date,setDate]=useState(dayKey());
 const [settings,setSettings]=useState(false);
 const [name,setName]=useState('');
 const [hours,setHours]=useState('1');
 const [minutes,setMinutes]=useState('0');
 const entries=cfg.activities||[];
 const overrides=cfg.overrides?.[date]||{};
 const budget=id=>overrides[id]??entries.find(x=>x.id===id)?.minutes??0;
 const total=entries.reduce((n,x)=>n+budget(x.id),0);
 const patch=fn=>onChange(fn(cfg));
 const add=()=>{const title=name.trim();if(!title)return;patch(c=>({...c,activities:[...(c.activities||[]),{id:crypto.randomUUID(),name:title,minutes:Math.max(0,Math.round(Number(hours||0)*60+Number(minutes||0)))}]}));setName('');};
 const updateMinutes=(id,v,forDay=false)=>patch(c=>forDay?({...c,overrides:{...(c.overrides||{}),[date]:{...(c.overrides?.[date]||{}),[id]:Math.max(0,Math.round(Number(v)||0))}}}):({...c,activities:(c.activities||[]).map(x=>x.id===id?{...x,minutes:Math.max(0,Math.round(Number(v)||0))}:x)}));
 const remove=id=>{if(!window.confirm('이 활동의 시간 예산을 삭제할까요?'))return;patch(c=>({...c,activities:(c.activities||[]).filter(x=>x.id!==id)}));};
 return <section className="tb-root"><div className="tb-heading"><div><h3>일일 시간 예산</h3><p>매일 배정할 시간을 설정해요.</p></div><button type="button" className="tb-settings" onClick={()=>setSettings(x=>!x)}><Settings2 size={17}/> {settings?'현황 보기':'시간 예산 설정'}</button></div>
 <div className="tb-date"><label>조회 날짜 <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><strong>배정 합계 {minutesText(total)}</strong></div>
 <div className="tb-note">Focus Flow 자동 연동은 아직 연결되지 않았어요. 실제 사용 시간은 연동 후 표시되며, 지금은 목표 시간만 저장돼요.</div>
 {entries.length===0&&!settings&&<p className="tb-empty">활동이 아직 없어요. 시간 예산 설정에서 추가해 줘.</p>}
 {entries.map(a=><div className="tb-activity" key={a.id}><div className="tb-activity-title"><strong>{a.name}</strong>{settings&&<button type="button" aria-label={`${a.name} 삭제`} onClick={()=>remove(a.id)}><Trash2 size={16}/></button>}</div><div className="tb-budget-row"><span>하루 목표</span>{settings?<div className="tb-edit-minutes"><input aria-label={`${a.name} 기본 목표 시간`} type="number" min="0" step="0.5" value={a.minutes/60} onChange={e=>updateMinutes(a.id,Math.round(Number(e.target.value)*60))}/> 시간</div>:<strong>{minutesText(budget(a.id))}</strong>}</div>{settings&&<div className="tb-budget-row"><span>{date}만 변경</span><div className="tb-edit-minutes"><input aria-label={`${a.name} 해당 날짜 목표 시간`} type="number" min="0" step="0.5" value={budget(a.id)/60} onChange={e=>updateMinutes(a.id,Math.round(Number(e.target.value)*60),true)}/> 시간</div></div>}<div className="tb-budget-row"><span>실제 사용</span><span className="tb-unlinked">연동 대기</span></div></div>)}
 {settings&&<div className="tb-add"><h4>활동 추가</h4><input placeholder="활동 이름 (예: 앱 개발)" value={name} onChange={e=>setName(e.target.value)}/><div className="tb-add-controls"><label>시간 <input type="number" min="0" max="24" value={hours} onChange={e=>setHours(e.target.value)}/></label><label>분 <input type="number" min="0" max="59" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><button type="button" onClick={add} disabled={!name.trim()}><Plus size={16}/> 추가</button></div></div>}
 <p className="tb-foot">기본 목표는 매일 적용되고, 날짜별 수정은 해당 날짜에만 적용돼요. 기존 날짜별 설정은 유지돼요.</p></section>;
}
