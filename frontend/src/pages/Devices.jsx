import axios from "axios";

export default function Devices(){
  const ping = async ()=>{
    const res = await axios.get(import.meta.env.VITE_API_URL + "/system/ping");
    alert(res.data.message);
  };

  return (
    <div>
      <h1>М склад</h1>
      <button onClick={ping}>Проверка API</button>
    </div>
  );
}
