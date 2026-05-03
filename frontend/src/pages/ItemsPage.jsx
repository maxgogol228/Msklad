import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import API from "../api";
import {
  Box,
  TextField,
  Button
} from "@mui/material";
import ImageUpload from "../components/ImageUpload";

export default function ItemsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");

  const addItem = async () => {
    console.log("Кнопка нажата");

    await API.post("/items", {
      name: "Деталь",
      quantity: 1,
      min_quantity: 1,
      order_link: "",
      image: ""
    });

    load();
  };

  const handleUpdate = async (newRow) => {
    await API.put(`/items/${newRow.id}`, newRow);
    return newRow;
  };

  

  const columns = [
    { field: "id", headerName: "ID", width: 70 },

    {
      field: "name",
      headerName: "Название",
      flex: 1,
      editable: true
    },

    {
      field: "quantity",
      headerName: "Количество",
      width: 120,
      editable: true
    },

    {
      field: "min_quantity",
      headerName: "Мин. остаток",
      width: 130,
      editable: true
    },

    {
      field: "order",
      headerName: "Заказ",
      width: 120,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const link = prompt("Вставь ссылку на заказ");
            if (link) {
              API.put(`/items/${params.row.id}`, {
                ...params.row,
                order_link: link
              }).then(load);
            }
          }}
        >
          Заказать
        </Button>
      )
    },

    {
      field: "image",
      headerName: "Фото",
      width: 120,
      renderCell: (params) => (
        params.value ? (
          <img src={params.value} style={{ width: 50 }} />
        ) : "-"
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
          Добавить деталь
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
