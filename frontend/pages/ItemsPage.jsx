import React, { useEffect, useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import API from "../api";

export default function ItemsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const res = await API.get("/items");
    setRows(res.data);
  };

  useEffect(() => { load(); }, []);

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Название", flex: 1, editable: true },
    { field: "quantity", headerName: "Кол-во", width: 120, editable: true }
  ];

  return (
    <Box>
      <Box display="flex" gap={2} mb={2}>
        <TextField label="Поиск" onChange={e => setFilter(e.target.value)} />
        <Button variant="contained">Добавить</Button>
      </Box>

      <div style={{ height: 500 }}>
        <DataGrid
          rows={rows.filter(r =>
            r.name.toLowerCase().includes(filter.toLowerCase())
          )}
          columns={columns}
        />
      </div>
    </Box>
  );
}