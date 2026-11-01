import React,{useMemo,useState} from 'react';
import {useFocusTime} from './useFocusTime.js';
import './TimeAnalysis.css';

const isoLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shift=(date,n)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+n);return isoLocal(d)};
const fmt=n=>`${(n/60).toFixed(1).replace(/\.0$/,'')}h`;
const totalForDate=(logs,active,date)=>{
 const start=new Date(`${date}T00:00:00`).getTime();const end=new Date(`${date}T00:00:00`);end.setDate(end.getDate()+1);
 const finish=end.getTime();const values={};
 for(const item of [...(logs||[]),...(active?.start?[{...active,end:new Date().toISOString()}]:[])]){
  const a=Date.parse(item.start),b=Date.parse(item.end);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||!item.activity)continue;
  const minutes=Math.max(0,Math.min(b,finish)-Math.max(a,start))/60000;
  if(minutes)values[item.activity]=(values[item.activity]||0)+minutes;
 }
 return values;
};
export default function TimeAnalysis({value}){
 const focus=useFocusTime();const cfg=value||{};
 const [activity,setActivity]=useState('all');const [span,setSpan]=useState(7);const [endDate,setEndDate]=useState(isoLocal(new Date()));
 const activities=useMemo(()=>[...new Set([...(focus.activities||[]),...(cfg.activities||[]).map(a=>a.name),...(focus.logs||[]).map(x=>x.activity).filter(Boolean)])],[focus.activities,focus.logs,cfg.activities]);
 const selected=activity==='all'?activities:[activity];
 const series=Array.from({length:span},(_,i)=>{const date=shift(endDate,i-span+1);const sums=totalForDate(focus.logs,focus.active,date);let goal=0,actual=0;
  for(const name of selected){const a=(cfg.activities||[]).find(x=>x.name===name);const override=cfg.overrides?.[date]?.[a?.id];goal+=override??a?.minutes??0;actual+=sums[name]||0;}
  return {date,goal,actual};
 });
 const goalSum=series.reduce((s,x)=>s+x.goal,0),actualSum=series.reduce((s,x)=>s+x.actual,0);
 const max=Math.max(60,...series.flatMap(d=>[d.goal,d.actual]));
 return <section className="ta-root">
  <h3>활동별 목표 · 실제 시간</h3><p className="ta-note">Focus Flow 타임로그와 90 Day의 일일 시간 예산을 비교해요.</p>
  {!focus.session?<p className="ta-message">먼저 옆의 KPI 탭에서 Focus Flow를 연결해 줘.</p>:!focus.ready?<p className="ta-message">Focus Flow 기록을 불러오는 중… {focus.error||''}</p>:<>
  <div className="ta-filters"><label>활동<select value={activities.includes(activity)?activity:'all'} onChange={e=>setActivity(e.target.value)}><option value="all">전체 활동</option>{activities.map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>기간<select value={span} onChange={e=>setSpan(Number(e.target.value))}><option value={7}>7일</option><option value={14}>14일</option><option value={30}>30일</option></select></label><label>종료일<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label></div>
  <div className="ta-totals"><div><small>목표 합계</small><strong>{fmt(goalSum)}</strong></div><div><small>실제 합계</small><strong>{fmt(actualSum)}</strong></div><div><small>목표 대비</small><strong>{actualSum>goalSum?'+':''}{fmt(actualSum-goalSum)}</strong></div></div>
  <div className="ta-legend"><span><i className="ta-key ta-goal"/>목표</span><span><i className="ta-key ta-actual"/>실제</span></div>
  <div className="ta-chart-scroll"><div className="ta-chart" style={{minWidth:span>14?Math.max(680,span*31):span>7?570:0}} role="img" aria-label={`${span}일간 목표 및 실제 시간 비교 막대그래프`}>
    {series.map(d=><div className="ta-day" key={d.date} title={`${d.date}: 목표 ${fmt(d.goal)}, 실제 ${fmt(d.actual)}`}><div className="ta-bar-area"><div className="ta-bar ta-bar-goal" style={{height:`${d.goal/max*100}%`}}/><div className="ta-bar ta-bar-actual" style={{height:`${d.actual/max*100}%`}}/></div><small>{d.date.slice(5).replace('-','/')}</small></div>)}
  </div></div>
  <div className="ta-daily-list">{series.map(d=><div key={d.date}><span>{d.date.slice(5).replace('-','/')}</span><span>목표 {fmt(d.goal)}</span><strong>실제 {fmt(d.actual)}</strong></div>)}</div>
  <p className="ta-note">일일 기본 목표와 해당 날짜에 따로 변경한 목표를 적용해요. 지나간 날짜의 기본 목표를 별도로 저장하지 않은 경우 현재 기본값이 반영돼요.</p>
  </>}
 </section>;
}
