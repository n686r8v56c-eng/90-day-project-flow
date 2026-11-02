import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ArrowLeft, Plus, ClipboardCheck, Copy, Trash2, Pencil, ChevronDown, ChevronRight, Check, X, RotateCcw, Archive, ArchiveRestore, Star} from 'lucide-react';
import './checklist.css';

const uuid = () => crypto.randomUUID();
const clean = v => String(v ?? '').trim();
const starterText = `새 체크리스트\n- 첫 번째 할 일\n- 두 번째 할 일`;
// Only title and dash-prefixed tasks. A single internal group preserves schema compatibility.
export function parseChecklist(input) {
 const lines=String(input||'').replace(/\r\n?/g,'\n').split('\n').map(x=>x.trim()).filter(Boolean);
 if(!lines.length)throw Error('제목과 할 일을 입력해 줘.');
 const title=lines[0].replace(/^#+\s*/,'').trim();
 if(!title)throw Error('첫 줄에 제목을 입력해 줘.');
 const tasks=lines.slice(1);
 if(!tasks.length)throw Error('제목 아래에 - 할 일을 한 줄 이상 입력해 줘.');
 const items=tasks.map(line=>{
  const m=line.match(/^[-*•]\s*(?:\[[ xX]\]\s*)?(.+)$/u);
  if(!m||!m[1].trim())throw Error('할 일은 각각 - 로 시작해 줘.');
  return {id:uuid(),text:m[1].trim(),done:false,status:'pending',completedAt:null};
 });
 return {title,groups:[{id:uuid(),title:'할 일',items}]};
}

const itemStage = item => item.done ? 2 : (item.status === 'in_progress' || item.status === 1 ? 1 : 0);
const countStarted = list => (list.groups||[]).flatMap(g=>g.items||[]).filter(x=>itemStage(x)>0).length;
const countDone = list => (list.groups||[]).flatMap(g=>g.items||[]).filter(x=>x.done).length;
const countAll = list => (list.groups||[]).reduce((n,g)=>n+(g.items||[]).length,0);

export function ChecklistPanel({client,userId,projectId,onClose,onChanged}) {
  const [lists,setLists] = useState([]);
  const [selectedId,setSelectedId] = useState(null);
  const [mode,setMode] = useState('list');
  const [source,setSource] = useState(starterText);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [collapsed,setCollapsed] = useState({});
  const [editing,setEditing] = useState(null);
  const [draft,setDraft] = useState('');
  const selected = lists.find(x=>x.id===selectedId);
  const activeLists = lists.filter(x=>!x.archived);
  const archivedLists = lists.filter(x=>!!x.archived);
  const [showArchived,setShowArchived] = useState(false);
  const visibleActive = activeLists;
  const visibleArchived = archivedLists;

  const refresh = useCallback(async () => {
    if (!client || !userId) return;
    const {data,error} = await client.from('app_checklists').select('*').eq('user_id',userId).eq('project_id',projectId).order('created_at',{ascending:true});
    if (error) {setError('체크리스트 목록을 불러오지 못했어: '+error.message);return;}
    setLists(data||[]);onChanged?.();
  },[client,userId,projectId]);
  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{
    if(!client || !userId) return;
    const ch=client.channel('app-checklists-'+userId).on('postgres_changes',{
      event:'*',schema:'public',table:'app_checklists',filter:`user_id=eq.${userId}`
    },()=>refresh()).subscribe();
    return ()=>{client.removeChannel(ch);};
  },[client,userId,refresh]);
  useEffect(()=>{
    const onResume=()=>{if(document.visibilityState==='visible')refresh();};
    document.addEventListener('visibilitychange',onResume);
    window.addEventListener('focus',onResume);
    return()=>{document.removeEventListener('visibilitychange',onResume);window.removeEventListener('focus',onResume);};
  },[refresh]);
  const fail=e=>{setError(e.message||String(e));setMessage('');};
  const saved=txt=>{setError('');setMessage(txt);};

  async function createFromText() {
    let parsed;
    try {parsed=parseChecklist(source);} catch(e) {fail(e);return;}
    if(!client || !userId) {fail(Error('로그인을 확인해 줘.'));return;}
    setBusy(true);setError('');
    try {
      const {data,error}=await client.from('app_checklists').insert({
        user_id:userId,project_id:projectId,title:parsed.title,groups:parsed.groups,tags:[]
      }).select().single();
      if(error) throw error;
      setLists(prev=>[data,...prev.filter(x=>x.id!==data.id)]);onChanged?.();
      setSelectedId(data.id);setMode('detail');saved('체크리스트를 저장했어.');
    } catch(e) {fail(e);} finally {setBusy(false);}
  }
  async function updateRow(row,patch,ok='저장했어.') {
    setBusy(true);setError('');
    try {
      const {data,error}=await client.from('app_checklists').update(patch).eq('user_id',userId).eq('id',row.id).select().single();
      if(error) throw error;
      setLists(prev=>prev.map(x=>x.id===row.id?data:x));onChanged?.(); saved(ok);
      return true;
    } catch(e) {fail(e);await refresh();return false;} finally {setBusy(false);}
  }
  async function toggleItem(groupId,itemId) {
    if(!selected || busy)return;
    const groups=selected.groups.map(g=>g.id!==groupId?g:{...g,items:g.items.map(x=>{
      if(x.id!==itemId)return x;
      const stage=(itemStage(x)+1)%3;
      return {...x,status:stage===1?'in_progress':stage===2?'completed':'pending',done:stage===2,completedAt:stage===2?new Date().toISOString():null};
    })});
    await updateRow(selected,{groups},'체크 상태 저장됨');
  }
  async function editText() {
    if(!selected || !clean(draft)) {setError('내용을 입력해 줘.');return;}
    let patch;
    if(editing.kind==='title') patch={title:clean(draft)};
    else patch={groups:selected.groups.map(g=>{
      if(editing.kind==='group'&&g.id===editing.groupId)return {...g,title:clean(draft)};
      if(editing.kind==='item'&&g.id===editing.groupId)return {...g,items:g.items.map(x=>x.id===editing.itemId?{...x,text:clean(draft)}:x)};
      return g;
    })};
    if(await updateRow(selected,patch))setEditing(null);
  }
  async function addItem(groupId) {
    if(!selected)return;
    const value=window.prompt('추가할 체크 항목');
    if(!clean(value))return;
    const groups=selected.groups.length?selected.groups:[{id:uuid(),title:'할 일',items:[]}];
    const target=groupId||groups[0].id;
    await updateRow(selected,{groups:groups.map(g=>g.id===target?{...g,items:[...g.items,{id:uuid(),text:clean(value),done:false}]}:g)});
  }
  async function removeItem(groupId,itemId) {
    if(!selected || !window.confirm('이 체크 항목을 삭제할까?'))return;
    await updateRow(selected,{groups:selected.groups.map(g=>g.id===groupId?{...g,items:g.items.filter(x=>x.id!==itemId)}:g)});
  }
  async function addGroup() {
    if(!selected)return;
    const name=window.prompt('새 그룹 이름');if(!clean(name))return;
    await updateRow(selected,{groups:[...selected.groups,{id:uuid(),title:clean(name),items:[]}]});
  }
  async function clone() {
    if(!selected||busy)return;
    setBusy(true);setError('');
    try{
      const groups=selected.groups.map(g=>({...g,id:uuid(),items:g.items.map(x=>({...x,id:uuid(),done:false,status:'pending',completedAt:null}))}));
      const {data,error}=await client.from('app_checklists').insert({user_id:userId,project_id:projectId,title:selected.title+' 복사',groups,tags:selected.tags||[]}).select().single();
      if(error)throw error;
      setLists(old=>[data,...old]);onChanged?.();setSelectedId(data.id);saved('체크하지 않은 새 복사본을 만들었어.');
    }catch(e){fail(e);}finally{setBusy(false);}
  }
  async function resetChecks(){
    if (!selected || busy || countStarted(selected) === 0) return;
    if (!window.confirm(`'${selected.title}' 체크리스트의 진행·완료 표시 ${countStarted(selected)}개를 모두 해제할까?\n그룹과 항목은 삭제되지 않아.`)) return;
    const groups = (selected.groups || []).map(g => ({
      ...g,
      items: (g.items || []).map(item => ({...item,done:false,status:'pending',completedAt:null}))
    }));
    await updateRow(selected, {groups}, '모든 체크를 해제했어.');
  }
  async function toggleArchive(row) {
    if(!row || busy) return;
    const next=!row.archived;
    if(await updateRow(row,{archived:next},next?'아카이브에 보관했어. 홈 진행률에서는 제외돼.':'아카이브에서 복원했어. 홈 진행률에 다시 포함돼.')) {
      setSelectedId(null);setMode('list');
      if(next)setShowArchived(false);
    }
  }
  async function toggleFeatured(row){
    if(!row||busy||row.archived)return;
    setBusy(true);setError('');
    try{
      const next=!row.featured;
      // Clear the previous featured checklist for this project first.
      if(next){const {error:clearError}=await client.from('app_checklists').update({featured:false}).eq('user_id',userId).eq('project_id',projectId).eq('featured',true);if(clearError)throw clearError;}
      const {error}=await client.from('app_checklists').update({featured:next}).eq('user_id',userId).eq('id',row.id);
      if(error)throw error;
      await refresh();saved(next?'홈 표시 체크리스트로 지정했어.':'오래된 체크리스트를 자동 표시해.');
    }catch(e){fail(e);await refresh();}finally{setBusy(false);}
  }
  async function removeList(){
    if(!selected||!window.confirm(`'${selected.title}' 체크리스트를 삭제할까?`))return;
    setBusy(true);try{
      const {error}=await client.from('app_checklists').delete().eq('user_id',userId).eq('id',selected.id);
      if(error)throw error;
      setLists(old=>old.filter(x=>x.id!==selected.id));onChanged?.();setSelectedId(null);setMode('list');saved('삭제했어.');
    }catch(e){fail(e);}finally{setBusy(false);}
  }
  const progress=selected?`${countDone(selected)}/${countAll(selected)}`:'0/0';
  return <section className="cl-page">
    <div className="cl-header">
      <button type="button" className="cl-back" onClick={()=>{if(mode==='list')onClose();else{setMode('list');setEditing(null);}}} aria-label="뒤로가기"><ArrowLeft size={19}/></button>
      <h1>체크리스트</h1>
      {mode==='list'&&<button className="cl-new" onClick={()=>{setSource(starterText);setMode('create');setError('');}}><Plus size={18}/> 추가</button>}
    </div>
    {error&&<p className="cl-error" role="alert">{error}</p>}
    {message&&<p className="cl-message" role="status">{message}</p>}
    {mode==='list'&&<>
      <div className="cl-list">{visibleActive.map(l=><div className="cl-list-row cl-featured-row" key={l.id}>
        <button type="button" className="cl-row-open" onClick={()=>{setSelectedId(l.id);setMode('detail');setMessage('');}}><span><strong>{l.title}</strong><small>{countDone(l)}/{countAll(l)} 완료</small></span><ChevronRight size={18}/></button>
        <button type="button" className="cl-feature-star" disabled={busy} aria-label={l.featured?'홈 표시 별표 해제':'홈에 이 체크리스트 표시'} title={l.featured?'홈 표시 해제':'홈에 표시'} onClick={()=>toggleFeatured(l)}><Star size={20} fill={l.featured?'#9772c6':'none'} color={l.featured?'#9772c6':'#aaa0b3'}/></button>
      </div>)}{!visibleActive.length&&<p className="cl-empty">진행 중인 체크리스트가 없어. + 추가로 만들어 봐!</p>}</div>
      <button type="button" className="cl-archive-toggle" onClick={()=>setShowArchived(v=>!v)} aria-expanded={showArchived}>
        <Archive size={17}/> 아카이브 ({archivedLists.length}) {showArchived?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
      </button>
      {showArchived&&<div className="cl-list">{visibleArchived.map(l=><button className="cl-list-row cl-archived-row" key={l.id} onClick={()=>{setSelectedId(l.id);setMode('detail');setMessage('');}}>
        <span><strong>{l.title}</strong><small>{countDone(l)}/{countAll(l)} 완료 · 집계 제외</small></span><ChevronRight size={18}/>
      </button>)}{!visibleArchived.length&&<p className="cl-empty">보관된 체크리스트가 없어.</p>}</div>}
    </>}
    {mode==='create'&&<div className="cl-card">
      <h2>글 붙여넣기</h2>
      <textarea aria-label="체크리스트 텍스트" className="cl-import" value={source} onChange={e=>setSource(e.target.value)} rows={15}/>
      <button className="cl-primary" disabled={busy} onClick={createFromText}>체크리스트 생성 및 저장</button>
    </div>}
    {mode==='detail'&&selected&&<>
      <div className="cl-detail-head"><div className="cl-detail-title-row"><h2>{selected.title}</h2><span className="cl-muted">{progress} 완료</span></div>
        <div className="cl-detail-toolbar">{selected.archived&&<p className="cl-muted">아카이브 · 홈 집계 제외</p>}
        <div className="cl-actions">
          <button type="button" aria-label={selected.archived?'아카이브에서 복원':'아카이브로 보관'} title={selected.archived?'아카이브에서 복원':'아카이브로 보관'} disabled={busy} onClick={()=>toggleArchive(selected)}>{selected.archived?<ArchiveRestore size={17}/>:<Archive size={17}/>}</button>
          <button type="button" aria-label="체크 상태 전체 초기화" title="전체 체크 초기화" disabled={busy || countStarted(selected)===0} onClick={resetChecks}><RotateCcw size={17}/></button>
          <button aria-label="제목 수정" title="제목 수정" onClick={()=>{setEditing({kind:'title'});setDraft(selected.title);}}><Pencil size={17}/></button>
          <button aria-label="체크리스트 복제" title="복제" onClick={clone}><Copy size={17}/></button>
          <button aria-label="체크리스트 삭제" title="삭제" onClick={removeList}><Trash2 size={17}/></button>
        </div>
        </div>
      </div>
      <div className="cl-card cl-flat-list">
        <div className="cl-items">{selected.groups.flatMap(g=>(g.items||[]).map(x=>({item:x,groupId:g.id}))).map(({item:x,groupId})=><div className="cl-item" key={x.id}>
          <div className={'cl-task-label '+(x.done?'cl-done':'')}>
            <button type="button" className={'cl-stage-check cl-stage-'+itemStage(x)} disabled={busy} onClick={()=>toggleItem(groupId,x.id)} aria-label={`${x.text}: ${itemStage(x)===0?'미시작':itemStage(x)===1?'진행 중':'완료'} · 누르면 다음 단계`}>{itemStage(x)===2?<Check size={15} strokeWidth={3}/>:null}</button>
            <span>{x.text}</span>
          </div>
          <button className="cl-small" aria-label={`${x.text} 수정`} onClick={()=>{setEditing({kind:'item',groupId,itemId:x.id});setDraft(x.text);}}><Pencil size={15}/></button>
          <button className="cl-small" aria-label={`${x.text} 삭제`} onClick={()=>removeItem(groupId,x.id)}><X size={15}/></button>
        </div>)}</div>
        <button className="cl-add" onClick={()=>addItem(selected.groups[0]?.id)}><Plus size={16}/> 항목 추가</button>
      </div>
      {editing&&<div className="cl-editor-backdrop" onClick={()=>setEditing(null)}><form className="cl-editor" onSubmit={e=>{e.preventDefault();editText();}} onClick={e=>e.stopPropagation()}>
        <h3>내용 수정</h3><textarea autoFocus rows={3} value={draft} onChange={e=>setDraft(e.target.value)}/>
        <div className="cl-editor-actions"><button type="button" onClick={()=>setEditing(null)}>취소</button><button className="cl-primary" disabled={busy||!clean(draft)}>저장</button></div>
      </form></div>}
    </>}
  </section>;
}
