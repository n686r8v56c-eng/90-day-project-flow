import React,{useMemo,useState} from 'react';
import {Star,Archive,ArchiveRestore,Pencil,Trash2,Check,X,Copy,ChevronDown,ChevronUp} from 'lucide-react';
import './SecretBoard.css';

export default function SecretBoard({items=[],onChange}){
  const [showArchive,setShowArchive]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [error,setError]=useState('');
  const [expanded,setExpanded]=useState({});
  const [copiedId,setCopiedId]=useState(null);
  const visible=useMemo(()=>items.filter(x=>!!x.archived===showArchive).sort((a,b)=>{
    if(!!a.starred!==!!b.starred)return a.starred?-1:1;
    if(a.starred&&b.starred){const diff=(Number(a.starredAt)||0)-(Number(b.starredAt)||0);if(diff)return diff;}
    return (Number(a.createdAt)||0)-(Number(b.createdAt)||0);
  }),[items,showArchive]);
  const clear=()=>{setEditingId(null);setTitle('');setBody('');setError('');};
  const beginEdit=x=>{setEditingId(x.id);setTitle(x.title||'');setBody(x.body||'');setError('');};
  const save=()=>{
    const t=title.trim(),b=body.trim();
    if(!t&&!b){setError('제목이나 내용을 입력해 줘.');return;}
    if(editingId){onChange(prev=>prev.map(x=>x.id===editingId?{...x,title:t,body:b,updatedAt:Date.now()}:x));}
    else onChange(prev=>[...prev,{id:crypto.randomUUID(),title:t,body:b,createdAt:Date.now(),updatedAt:Date.now(),starred:false,archived:false}]);
    clear();
  };
  const patch=(id,fn)=>onChange(prev=>prev.map(x=>x.id===id?fn(x):x));
  const copySecret=async x=>{
    const text=[x.title,x.body].filter(Boolean).join('\n\n');
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();if(!ok)throw new Error('copy failed');}
      setCopiedId(x.id);
    }catch{window.alert('복사하지 못했어. 브라우저의 클립보드 권한을 확인해 줘.');}
  };
  const remove=x=>{if(!window.confirm('이 시크릿을 완전히 삭제할까?'))return;onChange(prev=>prev.filter(i=>i.id!==x.id));if(editingId===x.id)clear();};
  return <div className="secret-board">
    <div className="secret-board-header">
      <div><strong>나의 시크릿</strong><small>원하는 미래와 바람을 자유롭게 적어 둬</small></div>
      <button type="button" className="secret-archive-toggle" onClick={()=>setShowArchive(v=>!v)} aria-pressed={showArchive}>
        {showArchive?<ArchiveRestore size={16}/>:<Archive size={16}/>}{showArchive?'목록으로':'아카이브'}
      </button>
    </div>
    {!showArchive&&<div className="secret-editor">
      <input aria-label="시크릿 제목" placeholder="원하는 것의 제목" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/>
      <textarea aria-label="시크릿 내용" placeholder="내가 원하는 것을 자유롭게 적어봐…" value={body} onChange={e=>setBody(e.target.value)} rows={3}/>
      {error&&<small className="secret-error">{error}</small>}
      <div className="secret-editor-actions">
        {editingId&&<button type="button" className="secret-cancel" onClick={clear}><X size={15}/> 취소</button>}
        <button type="button" className="secret-save" onClick={save}><Check size={16}/> {editingId?'수정 저장':'시크릿 저장'}</button>
      </div>
    </div>}
    {visible.length===0?<p className="secret-empty">{showArchive?'아카이브한 시크릿이 없어.':'아직 등록한 시크릿이 없어. 원하는 것부터 하나 적어봐!'}</p>:<div className="secret-list">
      {visible.map(x=>{const isExpanded=!!expanded[x.id];return <article key={x.id} className={'secret-item'+(x.starred?' secret-item-starred':'')+(isExpanded?' secret-expanded':'')}>
        <div className="secret-item-top">
          <button type="button" className="secret-item-heading" aria-expanded={isExpanded} onClick={()=>setExpanded(v=>({...v,[x.id]:!v[x.id]}))}>
            <span className="secret-item-title">{x.title||x.body||'제목 없음'}</span>
            {isExpanded?<ChevronUp size={17}/>:<ChevronDown size={17}/ >}
          </button>
          <button type="button" className="secret-icon-button secret-star-button" onClick={()=>patch(x.id,y=>({...y,starred:!y.starred,starredAt:y.starred?null:Date.now()}))} title={x.starred?'별표 해제':'상단 별표 고정'} aria-label={x.starred?'별표 해제':'상단 별표 고정'} aria-pressed={!!x.starred}><Star size={18} color={x.starred?'#9873c8':'#a49bad'} fill={x.starred?'#9873c8':'none'}/></button>
        </div>
        {isExpanded&&<div className="secret-item-expanded-content">
          {x.body&&<p className="secret-item-body">{x.body}</p>}
          <div className="secret-item-tools">
            <button type="button" className="secret-icon-button" onClick={()=>copySecret(x)} title="제목·내용 복사" aria-label="제목·내용 복사"><Copy size={17}/></button>
            {!showArchive&&<button type="button" className="secret-icon-button" onClick={()=>beginEdit(x)} title="수정" aria-label="수정"><Pencil size={17}/></button>}
            <button type="button" className="secret-icon-button" onClick={()=>{patch(x.id,y=>({...y,archived:!y.archived}));if(editingId===x.id)clear();}} title={showArchive?'아카이브 복원':'아카이브'} aria-label={showArchive?'아카이브 복원':'아카이브'}>{showArchive?<ArchiveRestore size={17}/>:<Archive size={17}/>}</button>
            <button type="button" className="secret-icon-button" onClick={()=>remove(x)} title="완전 삭제" aria-label="완전 삭제"><Trash2 size={17}/></button>
            {copiedId===x.id&&<span className="secret-copy-feedback">복사됨</span>}
          </div>
        </div>}
      </article>})}
    </div>}
  </div>;
}
