import { useEffect, useState } from "react";
import API from "../api";
import { Box, Button } from "@mui/material";

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);

  const load = async () => {
    const res = await API.get("/devices");
    setDevices(res.data);
  };

  useEffect(() => { load(); }, []);

  const createDevice = async () => {
    await API.post("/devices", {
      name: "Новый прибор",
      components: []
    });
    load();
  };

  return (
    <Box>
      <Button variant="contained" onClick={createDevice}>
        Добавить прибор
      </Button>

      {devices.map(d => (
        <Box key={d.id} mt={2}>
          {d.name}

          <Button
            size="small"
            onClick={() => API.post(`/devices/${d.id}/assemble`).then(load)}
          >
            Собрать
          </Button>
        </Box>
      ))}
    </Box>
  );
}
