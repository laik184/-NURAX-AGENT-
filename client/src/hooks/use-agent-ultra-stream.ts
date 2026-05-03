
import {useEffect,useState} from "react";

export function useAgentUltraStream(runId?:string){
  const [events,setEvents]=useState<any[]>([]);

  useEffect(()=>{
    if(!runId) return;
    const es=new EventSource("/sse/agent");
    es.onmessage=(e)=>{
      try{
        const d=JSON.parse(e.data);
        if(d.id===runId) setEvents(p=>[...p,d]);
      }catch{}
    };
    return ()=>es.close();
  },[runId]);

  return events;
}
