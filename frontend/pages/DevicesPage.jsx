import React, { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import API from "../api";
import DeviceModal from "../components/DeviceModal";

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const res = await API.get("/devices");
    setDevices(res.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Создать прибор
      </Button>

      {devices.map(d => (
        <Box key={d.id}>
          {d.name}
          <Button onClick={() => API.post(`/devices/${d.id}/assemble`)}>
            Собрать
          </Button>
        </Box>
      ))}

      <DeviceModal open={open} onClose={() => setOpen(false)} reload={load} />
    </Box>
  );
}