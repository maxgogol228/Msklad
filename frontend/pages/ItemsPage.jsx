import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import API from "../api";
import { Box, TextField } from "@mui/material";

export default function ItemsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const res = await API.get("/items");
    setRows(res.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <TextField label="Поиск" onChange={e => setFilter(e.target.value)} />

      <div style={{ height: 500 }}>
        <DataGrid
          rows={rows.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()))}
          columns={[
            { field: "id", headerName: "ID", width: 70 },
            { field: "name", headerName: "Название", flex: 1, editable: true },
            { field: "quantity", headerName: "Кол-во", width: 120, editable: true }
          ]}
        />
      </div>
    </Box>
  );
}
