import React,{useMemo,useState} from 'react';
import {Plus,Check,Trash2,Pencil,X,ChevronLeft,ChevronRight} from 'lucide-react';
import './VisionRoadmap.css';
const WEEKS=13;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Math.round(Number(v)||min)));
const uid=()=>crypto.randomUUID();
const weekStart=(start,w)=>{const date=new Date((start||new Date().toISOString().slice(0,10))+'T12:00:00');date.setDate(date.getDate()+(w-1)*7);return date.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})};
export default function VisionRoadmap({start,value,onChange,projectName,kpiOptions=[],kpiValues={}}){
 const [week,setWeek]=useState(()=>{const startDate=new Date((start||'')+'T00:00:00');const diff=Math.floor((new Date().getTime()-startDate.getTime())/86400000);return Number.isFinite(diff)?clamp(Math.floor(diff/7)+1,1,13):1;});
 const [type,setType]=useState('kpi');
 const [editing,setEditing]=useState(null);
 const [draft,setDraft]=useState({title:'',notes:'',from:week,to:week,kpiName:'',target:'',unit:'',current:''});
 const [expanded,setExpanded]=useState(false);
 const rows=Array.isArray(value)?value:[];
 const items=useMemo(()=>rows.filter(x=>x&&x.title).sort((a,b)=>(a.from||1)-(b.from||1)),[rows]);
 const chartRows=items.length?items:[{id:'sample-focus',title:'집중 KPI (예시)',from:1,to:3,kind:'kpi',sample:true},{id:'sample-goal',title:'목표 달성 (예시)',from:4,to:6,kind:'kpi',sample:true}];
 const getProgress=x=>{const found=kpiOptions.find(k=>k.name===x.kpiName);const current=found?.auto&&Number.isFinite(Number(kpiValues[x.kpiName]))?Number(kpiValues[x.kpiName]):Number(x.current)||0;const target=Number(x.target)||0;return {current,target,percent:target>0?Math.max(0,Math.min(100,Math.round(current/target*100))):null,auto:!!found?.auto};};
 const reached=x=>{const progress=getProgress(x);return !!x.done||(progress.target>0&&progress.current>=progress.target)};
 const active=items.filter(x=>clamp(x.from||1,1,13)<=week&&clamp(x.to||x.from||1,1,13)>=week);
 const current=items.filter(reached).length;
 const openAdd=()=>{const k=kpiOptions[0];setDraft({title:k?.name||'',notes:'',from:week,to:week,kpiName:k?.name||'',target:k?.target||'',unit:k?.unit||'',current:'',kind:'kpi'});setEditing('new');setExpanded(true)};
 const openEdit=x=>{setDraft({...x});setEditing(x.id);setExpanded(true)};
 const persist=()=>{
  const title=String(draft.title||'').trim();if(!title)return;
  const from=clamp(draft.from,1,13),to=clamp(draft.to,from,13);
  const next={...draft,id:editing==='new'?uid():editing,title,from,to,kind:draft.kpiName?'kpi':(draft.kind||'kpi'),done:!!draft.done,target:draft.target===''?'':Math.max(0,Number(draft.target)||0),current:draft.current===''?'':Math.max(0,Number(draft.current)||0)};
  onChange(prev=>editing==='new'?[...prev,next]:prev.map(x=>x.id===editing?next:x));
  setEditing(null);
 };
 const toggle=x=>onChange(prev=>prev.map(y=>y.id===x.id?{...y,done:!y.done}:y));
 const remove=x=>{if(!window.confirm('이 계획을 삭제할까?'))return;onChange(prev=>prev.filter(y=>y.id!==x.id))};
 return <section className="vr-root">
  <div className="vr-head"><div><strong>90일 · 13주 로드맵</strong><small>{projectName} · 목표 달성 {current}/{items.length}</small></div><button type="button" className="vr-add" onClick={openAdd}><Plus size={16}/> 집중 KPI</button></div>
  <div className="vr-scroll" aria-label="주차별 로드맵">
   <div className="vr-grid" style={{gridTemplateColumns:'96px repeat(13,58px)'}}>
    <div className="vr-cell vr-header vr-label">계획 / 주차</div>
    {Array.from({length:WEEKS},(_,i)=>i+1).map(w=><button type="button" key={w} className={'vr-cell vr-header vr-week '+(week===w?'selected':'')} onClick={()=>setWeek(w)}><strong>W{w}</strong><small>{weekStart(start,w)}</small></button>)}
    {chartRows.map(x=><React.Fragment key={x.id}>
      <button type="button" className={'vr-cell vr-rowtitle '+(x.done?'done':'')} onClick={()=>x.sample?openAdd():openEdit(x)} title={x.title}>▰ {x.title}</button>
      {Array.from({length:WEEKS},(_,i)=>i+1).map(w=><button type="button" className={'vr-cell vr-slot '+(week===w?'highlight':'')} key={w} onClick={()=>setWeek(w)} aria-label={x.title+' '+w+'주차'}>{w>=x.from&&w<=x.to&&<span className={'vr-bar '+(x.done?'complete':'')}/>}</button>)}
    </React.Fragment>)}
   </div>
  </div>
  {!items.length&&<p className="vr-empty">위 막대는 예시야. + 집중 KPI에서 목표 수치와 달성 기한을 정해 봐!</p>}
  <div className="vr-week-panel">
   <div className="vr-week-title"><button type="button" aria-label="이전 주" onClick={()=>setWeek(w=>Math.max(1,w-1))} disabled={week===1}><ChevronLeft size={18}/></button><strong>W{week} · {weekStart(start,week)} 시작</strong><button type="button" aria-label="다음 주" onClick={()=>setWeek(w=>Math.min(13,w+1))} disabled={week===13}><ChevronRight size={18}/></button></div>
   {active.length?active.map(x=><div className="vr-current" key={x.id}><button type="button" className={'vr-check '+(reached(x)?'checked':'')} onClick={()=>toggle(x)} aria-label={x.done?'완료 해제':'완료'}>{reached(x)&&<Check size={14}/>}</button><button type="button" className="vr-current-text" onClick={()=>openEdit(x)}><strong className={reached(x)?'done':''}>{x.title}</strong>{x.kpiName&&Number(x.target)>0&&<small>{getProgress(x).current.toLocaleString()} / {Number(x.target).toLocaleString()} {x.unit||''} · {getProgress(x).percent}% {getProgress(x).auto?'· 자동':'· 수동'}</small>}{x.notes&&<small>{x.notes}</small>}</button><button type="button" className="vr-edit" aria-label="수정" onClick={()=>openEdit(x)}><Pencil size={15}/></button></div>):<p className="vr-empty">이번 주에 배정된 계획이 없어.</p>}
   <div className="vr-week-actions"><button type="button" onClick={openAdd}><Plus size={15}/> 집중 KPI 추가</button></div>
  </div>
  {items.length>0&&<><button type="button" className="vr-all-toggle" onClick={()=>setExpanded(x=>!x)}>{expanded?'전체 목록 접기':'전체 계획 '+items.length+'개 보기'}</button>{expanded&&!editing&&<div className="vr-all">{items.map(x=><div className="vr-all-row" key={x.id}><button type="button" className={'vr-check '+(x.done?'checked':'')} onClick={()=>toggle(x)}>{x.done&&<Check size={14}/>}</button><button type="button" className="vr-current-text" onClick={()=>openEdit(x)}><strong>{x.title}</strong><small>W{x.from}{x.to!==x.from?'–W'+x.to:''} · {x.kpiName?'집중 KPI':'기존 계획'}</small></button><button type="button" className="vr-edit" aria-label="삭제" onClick={()=>remove(x)}><Trash2 size={15}/></button></div>)}</div>}</>}
  {editing&&<div className="vr-form"><div className="vr-form-head"><strong>{editing==='new'?'집중 KPI 추가':'집중 KPI 수정'}</strong><button type="button" onClick={()=>setEditing(null)} aria-label="닫기"><X size={17}/></button></div>
  <label>연결할 KPI<select value={draft.kpiName||''} onChange={e=>{const k=kpiOptions.find(x=>x.name===e.target.value);setDraft(d=>({...d,kpiName:k?.name||'',title:k?.name||d.title,target:k?.target||d.target||'',unit:k?.unit||'',current:k?.auto?'':d.current}))}}><option value="">직접 입력 / 기존 계획</option>{kpiOptions.map(k=><option value={k.name} key={k.name}>{k.name}{k.auto?' · 자동':''}</option>)}</select></label>
  <label>달성 목표<input aria-label="목표 이름" value={draft.title||''} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="예: 무지출 7일 달성"/></label>
  <div className="vr-form-dates"><label>목표 수치<input type="number" inputMode="decimal" min="0" value={draft.target??''} onChange={e=>setDraft(d=>({...d,target:e.target.value}))} placeholder="예: 7"/></label><label>단위<input value={draft.unit||''} onChange={e=>setDraft(d=>({...d,unit:e.target.value}))} placeholder="일, 개, 회"/></label></div>
  {!(kpiOptions.find(k=>k.name===draft.kpiName)?.auto)&&<label>현재 수치 (수동)<input type="number" inputMode="decimal" min="0" value={draft.current??''} onChange={e=>setDraft(d=>({...d,current:e.target.value}))} placeholder="현재 달성 수치"/></label>}
  {kpiOptions.find(k=>k.name===draft.kpiName)?.auto&&<p className="vr-empty">이 KPI는 90 Day에 기록된 실적을 자동으로 반영해.</p>}
  <div className="vr-form-dates"><label>집중 시작<select value={draft.from||1} onChange={e=>setDraft(d=>({...d,from:Number(e.target.value),to:Math.max(Number(e.target.value),d.to||1)}))}>{Array.from({length:13},(_,i)=><option key={i} value={i+1}>W{i+1}</option>)}</select></label><label>달성 기한<select value={draft.to||draft.from||1} onChange={e=>setDraft(d=>({...d,to:Number(e.target.value)}))}>{Array.from({length:13},(_,i)=>i+1).filter(w=>w>=(draft.from||1)).map(w=><option key={w} value={w}>W{w}</option>)}</select></label></div>
  <label>메모<textarea aria-label="메모" value={draft.notes||''} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} placeholder="이번 집중 기간의 실행 계획" rows={2}/></label>
  <div className="vr-form-actions">{editing!=='new'&&<button type="button" className="vr-delete" onClick={()=>{remove(draft);setEditing(null)}}><Trash2 size={15}/> 삭제</button>}<button type="button" className="vr-save" disabled={!draft.title?.trim()} onClick={persist}>저장</button></div></div>}
 </section>;
}
