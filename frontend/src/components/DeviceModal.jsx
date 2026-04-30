import { Dialog, DialogTitle, DialogContent, Button } from "@mui/material";
import { useEffect, useState } from "react";
import API from "../api";

export default function DeviceModal({ open, onClose, reload }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    API.get("/items").then(res => setItems(res.data));
  }, []);

  const save = async () => {
    await API.post("/devices", {
      name: "Новый прибор",
      components: selected
    });

    reload();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Выбор деталей</DialogTitle>

      <DialogContent>
        {items.map(i => (
          <div key={i.id}>
            <input
              type="checkbox"
              onChange={() =>
                setSelected([...selected, { item_id: i.id, quantity: 1 }])
              }
            />
            {i.name}
          </div>
        ))}

        <Button onClick={save}>Сохранить</Button>
      </DialogContent>
    </Dialog>
  );
}