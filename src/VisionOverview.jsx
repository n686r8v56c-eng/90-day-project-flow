import React,{useState} from 'react';
import {Check,ChevronLeft,ChevronRight} from 'lucide-react';
import './VisionOverview.css';
const weeks=Array.from({length:13},(_,i)=>i+1);
const weekDate=(start,w)=>{const d=new Date((start||new Date().toISOString().slice(0,10))+'T12:00:00');d.setDate(d.getDate()+(w-1)*7);return d.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})};
const inWeek=(item,w)=>w>=Number(item.from||1)&&w<=Number(item.to||item.from||1);
export default function VisionOverview({mode,projects,secrets,roadmaps,start,onOpenProject,onToggleMilestone}){
 const [week,setWeek]=useState(()=>{const days=Math.floor((Date.now()-new Date((start||new Date().toISOString().slice(0,10))+'T00:00:00').getTime())/86400000);return Math.min(13,Math.max(1,Math.floor(days/7)+1||1))});
 const visible=projects.filter(p=>!p.archived&&p.id!=='license');
 const statements=visible.flatMap(p=>(secrets?.[p.id]||[]).filter(x=>x.starred&&!x.archived).sort((a,b)=>(Number(a.starredAt)||0)-(Number(b.starredAt)||0)).map(x=>({project:p,item:x})));
 const milestones=visible.flatMap(p=>(Array.isArray(roadmaps?.[p.id])?roadmaps[p.id]:[]).filter(x=>x?.title).map(x=>({project:p,item:x}))).sort((a,b)=>(a.item.from||1)-(b.item.from||1));
 return <section className="vo-root">
 {mode==='words'?<><div className="vo-summary"><strong>전체 비전 한마디</strong><small>각 프로젝트 카드 바깥에 표시한 별표 비전들을 모았어 · {statements.length}개</small></div>
 {statements.length?visible.map(p=>{const rows=statements.filter(x=>x.project.id===p.id);return rows.length?<section className="vo-words-project" key={p.id}><button className="vo-project-title" type="button" onClick={()=>onOpenProject(p.id,'vision')}>{p.icon} {p.name}</button>{rows.map(({item})=><div className="vo-quote" key={item.id}><span>✦</span><div><strong>{item.title||item.body||'제목 없음'}</strong>{item.title&&item.body&&<small>{item.body}</small>}</div></div>)}</section>:null}):<p className="vo-empty">아직 별표한 비전 한마디가 없어. 프로젝트의 비전 탭에서 별표를 눌러봐!</p>}</>:
 <><div className="vo-summary"><strong>전체 마일스톤 · 13주</strong><small>프로젝트를 가로질러 주간 집중 목표와 마일스톤을 한눈에 확인해.</small></div>
 <div className="vo-scroll" aria-label="전체 프로젝트 13주 간트차트"><div className="vo-grid" style={{gridTemplateColumns:'115px repeat(13,56px)'}}>
 <div className="vo-corner">프로젝트 / 주차</div>{weeks.map(w=><button type="button" key={w} className={'vo-week '+(w===week?'active':'')} onClick={()=>setWeek(w)}>W{w}</button>)}
 {milestones.map(({project,item})=><React.Fragment key={project.id+'-'+item.id}>
 <button type="button" className="vo-row-name" title={project.name+' · '+item.title} onClick={()=>onOpenProject(project.id,'milestones')}><span>{project.icon} {project.name}</span><small>{item.title}</small></button>
 {weeks.map(w=><button key={w} type="button" aria-label={item.title+' W'+w} onClick={()=>setWeek(w)} className={'vo-cell '+(week===w?'current':'')}>{inWeek(item,w)&&<span className={'vo-bar '+(item.done?'done':'')+(item.kind==='milestone'?' diamond':'')}/>}</button>)}
 </React.Fragment>)}</div></div>
 {!milestones.length&&<p className="vo-empty">아직 등록한 계획이 없어. 각 프로젝트 → 마일스톤에서 집중 목표를 등록하면 여기에 모여.</p>}
 <div className="vo-week-list"><div className="vo-week-title"><button onClick={()=>setWeek(n=>Math.max(1,n-1))} disabled={week===1} aria-label="이전 주"><ChevronLeft size={18}/></button><strong>W{week} · {weekDate(start,week)} 시작</strong><button onClick={()=>setWeek(n=>Math.min(13,n+1))} disabled={week===13} aria-label="다음 주"><ChevronRight size={18}/></button></div>
 {milestones.filter(({item})=>inWeek(item,week)).map(({project,item})=><div className="vo-week-row" key={project.id+'-'+item.id}><button className={'vo-check '+(item.done?'done':'')} onClick={()=>onToggleMilestone(project.id,item.id)} aria-label={item.done?'완료 취소':'완료 체크'}>{item.done&&<Check size={13}/>}</button><button type="button" className="vo-week-item" onClick={()=>onOpenProject(project.id,'milestones')}><small>{project.icon} {project.name} · {item.kind==='milestone'?'마일스톤':'주간 집중'}</small><strong className={item.done?'completed':''}>{item.title}</strong></button></div>)}
 {!milestones.some(({item})=>inWeek(item,week))&&<p className="vo-empty">이 주차에는 등록된 계획이 없어.</p>}
 </div></>}
 </section>;
}
