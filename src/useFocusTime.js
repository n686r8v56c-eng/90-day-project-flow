import {useEffect,useState,useCallback} from 'react';
import {createClient} from '@supabase/supabase-js';

// Focus Flow uses a separate Supabase project. This is its PUBLIC publishable key,
// never a service-role key. Each user signs in to Focus Flow in this app once;
// the Focus Flow RLS and authenticated RPC enforce ownership of the records.
const focusClient=createClient(
  'https://cntwtmaqyjwtnpybjare.supabase.co',
  'sb_publishable_8tjs1LsNSb2Ro0Hlw7Ka0A_-a60Ak8U',
  {auth:{storageKey:'90day-focus-flow-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}
);
const originalActivities=['앱개발','공부','운동','명상'];
export function useFocusTime(){
 const [session,setSession]=useState(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState({activities:[],logs:[],active:null,ready:false});
 useEffect(()=>{
  let alive=true;
  focusClient.auth.getSession().then(({data,error:e})=>{
    if(alive){setSession(data?.session||null);setError(e?.message||'');setLoading(false);}
  });
  const {data:{subscription}}=focusClient.auth.onAuthStateChange((_ev,next)=>{
   if(alive){setSession(next);setLoading(false);}
  });
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 const refresh=useCallback(async()=>{
  if(!session?.user?.id)return;
  const userId=session.user.id;
  setBusy(true);setError('');
  try{
   const [stateResponse,logResponse]=await Promise.all([
    focusClient.from('focus_flow_states').select('data').eq('user_id',userId).maybeSingle(),
    focusClient.rpc('focus_timelog_action',{p_action:'read'})
   ]);
   if(stateResponse.error)throw stateResponse.error;
   if(logResponse.error)throw logResponse.error;
   const logConfig=stateResponse.data?.data?.timeLog||{};
   const selected=Array.isArray(logConfig.activityList)
    ?logConfig.activityList
    :[...new Set([...originalActivities,...(logConfig.activities||[])])];
   const logs=Array.isArray(logResponse.data?.entries)?logResponse.data.entries:[];
   const active=logResponse.data?.active||null;
   setResult({activities:selected.filter(v=>typeof v==='string'&&v.trim()),logs,active,ready:true});
  }catch(e){setError('Focus Flow 기록을 불러오지 못했어: '+(e?.message||String(e)));}
  finally{setBusy(false);}
 },[session?.user?.id]);
 useEffect(()=>{if(!session?.user?.id){setResult({activities:[],logs:[],active:null,ready:false});return;}
   refresh();
   const id=setInterval(refresh,30000);
   const onWake=()=>{if(document.visibilityState==='visible')refresh();};
   window.addEventListener('focus',onWake);
   document.addEventListener('visibilitychange',onWake);
   return()=>{clearInterval(id);window.removeEventListener('focus',onWake);document.removeEventListener('visibilitychange',onWake)};
 },[session?.user?.id,refresh]);
 const signIn=async(email,password)=>{
  setBusy(true);setError('');
  const {error:e}=await focusClient.auth.signInWithPassword({email,password});
  setBusy(false);
  if(e){setError('Focus Flow 로그인 실패: '+e.message);return false;}
  return true;
 };
 const signOut=async()=>{const {error:e}=await focusClient.auth.signOut();if(e)setError(e.message);};
 return {session,loading,busy,error,...result,refresh,signIn,signOut};
}
