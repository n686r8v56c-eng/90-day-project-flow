import React,{useMemo,useState} from 'react';
import {Plus,Check,Trash2,Pencil,X,ChevronLeft,ChevronRight} from 'lucide-react';
import './VisionRoadmap.css';
const WEEKS=13;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Math.round(Number(v)||min)));
const uid=()=>crypto.randomUUID();
const weekStart=(start,w)=>{const date=new Date((start||new Date().toISOString().slice(0,10))+'T12:00:00');date.setDate(date.getDate()+(w-1)*7);return date.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})};
export default function VisionRoadmap({start,value,onChange,projectName}){
 const [week,setWeek]=useState(()=>{const startDate=new Date((start||'')+'T00:00:00');const diff=Math.floor((new Date().getTime()-startDate.getTime())/86400000);return Number.isFinite(diff)?clamp(Math.floor(diff/7)+1,1,13):1;});
 const [type,setType]=useState('focus');
 const [editing,setEditing]=useState(null);
 const [draft,setDraft]=useState({title:'',notes:'',from:week,to:week});
 const [expanded,setExpanded]=useState(false);
 const rows=Array.isArray(value)?value:[];
 const items=useMemo(()=>rows.filter(x=>x&&x.title).sort((a,b)=>(a.from||1)-(b.from||1)),[rows]);
 const active=items.filter(x=>clamp(x.from||1,1,13)<=week&&clamp(x.to||x.from||1,1,13)>=week);
 const current=items.filter(x=>x.done).length;
 const openAdd=(kind=type)=>{setType(kind);setDraft({title:'',notes:'',from:week,to:week,kind});setEditing('new');setExpanded(true)};
 const openEdit=x=>{setDraft({...x});setType(x.kind||'focus');setEditing(x.id);setExpanded(true)};
 const persist=()=>{
  const title=String(draft.title||'').trim();if(!title)return;
  const from=clamp(draft.from,1,13),to=clamp(draft.to,from,13);
  const next={...draft,id:editing==='new'?uid():editing,title,from,to,kind:draft.kind||type,done:!!draft.done};
  onChange(prev=>editing==='new'?[...prev,next]:prev.map(x=>x.id===editing?next:x));
  setEditing(null);
 };
 const toggle=x=>onChange(prev=>prev.map(y=>y.id===x.id?{...y,done:!y.done}:y));
 const remove=x=>{if(!window.confirm('이 계획을 삭제할까?'))return;onChange(prev=>prev.filter(y=>y.id!==x.id))};
 return <section className="vr-root">
  <div className="vr-head"><div><strong>90일 · 13주 로드맵</strong><small>{projectName} · 완료 {current}/{items.length}</small></div><button type="button" className="vr-add" onClick={()=>openAdd('focus')}><Plus size={16}/> 집중 목표</button></div>
  <div className="vr-scroll" aria-label="주차별 로드맵">
   <div className="vr-grid" style={{gridTemplateColumns:'96px repeat(13,58px)'}}>
    <div className="vr-cell vr-header vr-label">계획 / 주차</div>
    {Array.from({length:WEEKS},(_,i)=>i+1).map(w=><button type="button" key={w} className={'vr-cell vr-header vr-week '+(week===w?'selected':'')} onClick={()=>setWeek(w)}><strong>W{w}</strong><small>{weekStart(start,w)}</small></button>)}
    {items.map(x=><React.Fragment key={x.id}>
      <button type="button" className={'vr-cell vr-rowtitle '+(x.done?'done':'')} onClick={()=>openEdit(x)} title={x.title}>{x.kind==='milestone'?'◆ ':'▰ '}{x.title}</button>
      {Array.from({length:WEEKS},(_,i)=>i+1).map(w=><button type="button" className={'vr-cell vr-slot '+(week===w?'highlight':'')} key={w} onClick={()=>setWeek(w)} aria-label={x.title+' '+w+'주차'}>{w>=x.from&&w<=x.to&&<span className={'vr-bar '+(x.done?'complete':'')+(x.kind==='milestone'?' marker':'')}/>}</button>)}
    </React.Fragment>)}
   </div>
  </div>
  {!items.length&&<p className="vr-empty">아직 계획이 없어. 이번 주 집중 목표부터 하나 만들어 봐!</p>}
  <div className="vr-week-panel">
   <div className="vr-week-title"><button type="button" aria-label="이전 주" onClick={()=>setWeek(w=>Math.max(1,w-1))} disabled={week===1}><ChevronLeft size={18}/></button><strong>W{week} · {weekStart(start,week)} 시작</strong><button type="button" aria-label="다음 주" onClick={()=>setWeek(w=>Math.min(13,w+1))} disabled={week===13}><ChevronRight size={18}/></button></div>
   {active.length?active.map(x=><div className="vr-current" key={x.id}><button type="button" className={'vr-check '+(x.done?'checked':'')} onClick={()=>toggle(x)} aria-label={x.done?'완료 해제':'완료'}>{x.done&&<Check size={14}/>}</button><button type="button" className="vr-current-text" onClick={()=>openEdit(x)}><strong className={x.done?'done':''}>{x.kind==='milestone'?'◆ ':''}{x.title}</strong>{x.notes&&<small>{x.notes}</small>}</button><button type="button" className="vr-edit" aria-label="수정" onClick={()=>openEdit(x)}><Pencil size={15}/></button></div>):<p className="vr-empty">이번 주에 배정된 계획이 없어.</p>}
   <div className="vr-week-actions"><button type="button" onClick={()=>openAdd('focus')}><Plus size={15}/> 집중 목표</button><button type="button" onClick={()=>openAdd('milestone')}><Plus size={15}/> 마일스톤</button></div>
  </div>
  {items.length>0&&<><button type="button" className="vr-all-toggle" onClick={()=>setExpanded(x=>!x)}>{expanded?'전체 목록 접기':'전체 계획 '+items.length+'개 보기'}</button>{expanded&&!editing&&<div className="vr-all">{items.map(x=><div className="vr-all-row" key={x.id}><button type="button" className={'vr-check '+(x.done?'checked':'')} onClick={()=>toggle(x)}>{x.done&&<Check size={14}/>}</button><button type="button" className="vr-current-text" onClick={()=>openEdit(x)}><strong>{x.title}</strong><small>W{x.from}{x.to!==x.from?'–W'+x.to:''} · {x.kind==='milestone'?'마일스톤':'집중 목표'}</small></button><button type="button" className="vr-edit" aria-label="삭제" onClick={()=>remove(x)}><Trash2 size={15}/></button></div>)}</div>}</>}
  {editing&&<div className="vr-form"><div className="vr-form-head"><strong>{editing==='new'?'새 계획': '계획 수정'}</strong><button type="button" onClick={()=>setEditing(null)} aria-label="닫기"><X size={17}/></button></div><div className="vr-form-kind"><button type="button" className={draft.kind==='focus'?'active':''} onClick={()=>setDraft(d=>({...d,kind:'focus'}))}>주간 집중</button><button type="button" className={draft.kind==='milestone'?'active':''} onClick={()=>setDraft(d=>({...d,kind:'milestone'}))}>마일스톤</button></div><input aria-label="계획 제목" value={draft.title||''} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="예: 첫 시퀀스 완성"/><div className="vr-form-dates"><label>시작 주차<select value={draft.from||1} onChange={e=>setDraft(d=>({...d,from:Number(e.target.value),to:Math.max(Number(e.target.value),d.to||1)}))}>{Array.from({length:13},(_,i)=><option key={i} value={i+1}>W{i+1}</option>)}</select></label><label>종료 주차<select value={draft.to||draft.from||1} onChange={e=>setDraft(d=>({...d,to:Number(e.target.value)}))}>{Array.from({length:13},(_,i)=>i+1).filter(w=>w>=(draft.from||1)).map(w=><option key={w} value={w}>W{w}</option>)}</select></label></div><textarea aria-label="메모" value={draft.notes||''} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} placeholder="이 기간에 집중할 내용 (선택)" rows={2}/><div className="vr-form-actions">{editing!=='new'&&<button type="button" className="vr-delete" onClick={()=>{remove(draft);setEditing(null)}}><Trash2 size={15}/> 삭제</button>}<button type="button" className="vr-save" disabled={!draft.title?.trim()} onClick={persist}>저장</button></div></div>}
 </section>;
}
