import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import API from "../api";
import {
  Box,
  TextField,
  Button
} from "@mui/material";

export default function ConsumablesPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const res = await API.get("/consumables");
    setRows(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (newRow) => {
    await API.put(`/consumables/${newRow.id}`, newRow);
    return newRow;
  };

  const addItem = async () => {
    await API.post("/consumables", {
      name: "Новый расходник",
      quantity: 0,
      min_quantity: 0
    });
    load();
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },

    { field: "name", headerName: "Название", flex: 1, editable: true },
    { field: "quantity", headerName: "Количество", width: 120, editable: true },
    { field: "min_quantity", headerName: "Мин", width: 100, editable: true },

    {
      field: "order",
      headerName: "Заказ",
      width: 120,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const link = prompt("Ссылка на заказ");
            if (link) {
              API.put(`/consumables/${params.row.id}`, {
                ...params.row,
                order_link: link
              }).then(load);
            }
          }}
        >
          Заказать
        </Button>
      )
    }
  ];

  return (
    <Box>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Поиск"
          size="small"
          onChange={(e) => setFilter(e.target.value)}
        />

        <Button variant="contained" onClick={addItem}>
          Добавить расходник
        </Button>
      </Box>

      <div style={{ height: 500 }}>
        <DataGrid
          rows={rows.filter(r =>
            r.name.toLowerCase().includes(filter.toLowerCase())
          )}
          columns={columns}
          processRowUpdate={handleUpdate}
        />
      </div>
    </Box>
  );
}
