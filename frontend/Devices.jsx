
import {useEffect,useState} from "react";
import API from "../api/api";

export default function Devices(){
  const [devices,setDevices]=useState([]);

  useEffect(()=>{
    API.get("/devices").then(r=>setDevices(r.data));
  },[]);

  const assemble=id=>{
    API.post("/devices/"+id+"/assemble");
  };

  return (
    <div>
      <h1>Приборы</h1>
      {devices.map(d=>(
        <div key={d.id}>
          {d.name}
          <button onClick={()=>assemble(d.id)}>Собрать</button>
        </div>
      ))}
    </div>
  );
}
