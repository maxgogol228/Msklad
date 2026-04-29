import {useEffect,useState} from "react";
import axios from "axios";
import React from "react";

const API=axios.create({baseURL:import.meta.env.VITE_API_URL});
let count=0; setInterval(()=>count=0,60000);

export default function App(){
  const [items,setItems]=useState([]);
  const [devices,setDevices]=useState([]);
  const [filter,setFilter]=useState("");
  const [blocked,setBlocked]=useState(false);
  const [showModal,setShowModal]=useState(false);
  const [selectedItems,setSelectedItems]=useState([]);

  const safe=async(fn)=>{
    count++; if(count>60){setBlocked(true);return;}
    return fn();
  };

  const load=async()=>{
    const i=await safe(()=>API.get("/items"));
    if(i) setItems(i.data);
    const d=await safe(()=>API.get("/devices"));
    if(d) setDevices(d.data);
  };

  useEffect(()=>{load();},[]);

  const updateItem=async(i)=>{
    await safe(()=>API.put("/items/"+i.id,i));
    load();
  };

  const upload=(e,i)=>{
    const r=new FileReader();
    r.onload=()=>{i.image=r.result;updateItem(i);};
    r.readAsDataURL(e.target.files[0]);
  };

  const copyState=()=>{
    const data={items,devices};
    navigator.clipboard.writeText(JSON.stringify(data));
  };

  const loadState=()=>{
    const txt=prompt("Вставь состояние");
    const data=JSON.parse(txt);
    setItems(data.items);
    setDevices(data.devices);
  };

  if(blocked){
    return <div style={{color:"white"}}>
      <h2>Проверка</h2>
      <button onClick={()=>{setBlocked(false);count=0}}>Я человек</button>
    </div>
  }

  return <div style={{background:"#111",color:"#eee",padding:20}}>
    <h1>М склад</h1>

    <input placeholder="Фильтр" onChange={e=>setFilter(e.target.value)}/>

    <table border="1">
      <thead><tr><th>Имя</th><th>Кол-во</th><th>Фото</th></tr></thead>
      <tbody>
        {items.filter(i=>i.name.toLowerCase().includes(filter.toLowerCase())).map(i=>(
          <tr key={i.id}>
            <td contentEditable onBlur={e=>{i.name=e.target.innerText;updateItem(i);}}>{i.name}</td>
            <td contentEditable onBlur={e=>{i.quantity=e.target.innerText;updateItem(i);}}>{i.quantity}</td>
            <td>
              {i.image && <img src={i.image} width="40"/>}
              <input type="file" onChange={e=>upload(e,i)}/>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <h2>Приборы</h2>
    <button onClick={()=>setShowModal(true)}>Создать прибор</button>

    {devices.map(d=>(
      <div key={d.id}>
        {d.name}
        <button onClick={()=>safe(()=>API.post("/devices/"+d.id+"/assemble"))}>Собрать</button>
      </div>
    ))}

    {showModal && <div style={{position:"fixed",background:"#222",padding:20}}>
      <h3>Выбор деталей</h3>
      {items.map(i=>(
        <div key={i.id}>
          <input type="checkbox" onChange={()=>setSelectedItems([...selectedItems,{item_id:i.id,quantity:1}])}/>
          {i.name}
        </div>
      ))}
      <button onClick={async()=>{
        await safe(()=>API.post("/devices",{name:"Прибор",components:selectedItems}));
        setShowModal(false);
        load();
      }}>Сохранить</button>
    </div>}

    <button style={{position:"fixed",bottom:10,right:10}} onClick={copyState}>📋</button>
    <button style={{position:"fixed",bottom:10,right:50}} onClick={loadState}>⬇</button>
  </div>;
}
