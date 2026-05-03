import React, { useEffect, useState } from 'react';

export default function PreviewPanel(){
  const [status, setStatus] = useState({});
  const [logs, setLogs] = useState<{ts:number,msg:string}[]>([]);
  const [target, setTarget] = useState('tunnel');

  async function refresh(){
    try{
      const r = await fetch('/api/preview/status');
      const j = await r.json();
      if(j.ok) setStatus(j.status);
    }catch(e){}
  }

  async function start(t){
    try{
      await fetch('/api/preview/start', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ target: t }) });
      setTarget(t);
      refresh();
    }catch(e){}
  }

  async function stop(t){
    try{
      await fetch('/api/preview/stop', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ target: t }) });
      refresh();
    }catch(e){}
  }

  async function loadLogs(){
    try{
      const r = await fetch('/api/preview/logs?target='+encodeURIComponent(target));
      const j = await r.json();
      if(j.ok) setLogs(j.logs || []);
    }catch(e){}
  }

  useEffect(()=>{ refresh(); const iv = setInterval(refresh, 3000); return ()=>clearInterval(iv); },[]);

  return (
    <div style={{padding:12, border:'1px solid #eee', marginTop:12}}>
      <h4>Preview Control</h4>
      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <button onClick={()=>start('web')}>Start Web Preview</button>
        <button onClick={()=>start('tunnel')}>Start Tunnel (Android/iOS)</button>
        <button onClick={()=>stop('web')}>Stop Web</button>
        <button onClick={()=>stop('tunnel')}>Stop Tunnel</button>
        <button onClick={loadLogs}>Load Logs</button>
      </div>
      <div>
        <strong>Status:</strong>
        <pre style={{whiteSpace:'pre-wrap', background:'#fafafa', padding:8}}>{JSON.stringify(status,null,2)}</pre>
      </div>
      <div style={{marginTop:8}}>
        <strong>Logs ({target}):</strong>
        <div style={{height:200, overflow:'auto', background:'#fff', padding:8}}>
          {logs.map((l,idx)=>(<div key={idx} style={{fontSize:12, borderBottom:'1px solid #f0f0f0', padding:4}}>{new Date(l.ts).toLocaleTimeString()} - {String(l.msg)}</div>))}
        </div>
      </div>
    </div>
  );
}
