import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import API from "../api";
import {
  Box,
  TextField,
  Button,
  Link
} from "@mui/material";
import ImageUpload from "../components/ImageUpload";

export default function ConsumablesPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const res = await API.get("/consumables");
    setRows(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  // сохранение изменений
  const handleUpdate = async (params) => {
    await API.put(`/consumables/${params.id}`, params);
    load();
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
      headerName: "Кол-во",
      width: 120,
      editable: true
    },

    {
      field: "min_quantity",
      headerName: "Мин",
      width: 100,
      editable: true
    },

    {
      field: "order_link",
      headerName: "Заказ",
      width: 150,
      renderCell: (params) =>
        params.value ? (
          <Link href={params.value} target="_blank">
            Открыть
          </Link>
        ) : (
          "-"
        )
    },

    {
      field: "image",
      headerName: "Изображение",
      width: 120,
      renderCell: (params) => (
        params.value ? (
          <img
            src={params.value}
            style={{
              width: 50,
              height: 50,
              objectFit: "cover"
            }}
          />
        ) : "-"
      )
    }
  ];

  return (
    <Box>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          size="small"
          label="Поиск"
          onChange={(e) => setFilter(e.target.value)}
        />

        <Button
          variant="contained"
          onClick={async () => {
            await API.post("/consumables", {
              name: "Новый расходник",
              quantity: 0,
              min_quantity: 0
            });
            load();
          }}
        >
          Добавить
        </Button>
      </Box>

      <div style={{ height: 500 }}>
        <DataGrid
          rows={rows.filter((r) =>
            r.name.toLowerCase().includes(filter.toLowerCase())
          )}
          columns={columns}
          processRowUpdate={handleUpdate}
          experimentalFeatures={{ newEditingApi: true }}
        />
      </div>
    </Box>
  );
}
