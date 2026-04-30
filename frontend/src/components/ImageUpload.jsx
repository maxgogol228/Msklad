import React, { useState } from "react";
import { Box, Button } from "@mui/material";

export default function ImageUpload({ value, onChange }) {
  const [preview, setPreview] = useState(value || null);

  // конвертация файла в base64
  const toBase64 = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });

  // обработка загрузки
  const handleFile = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const base64 = await toBase64(file);

    setPreview(base64);
    onChange && onChange(base64);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      {/* превью */}
      {preview && (
        <img
          src={preview}
          alt="preview"
          style={{
            width: 80,
            height: 80,
            objectFit: "cover",
            border: "1px solid #333"
          }}
        />
      )}

      {/* кнопка */}
      <Button variant="outlined" component="label">
        Загрузить
        <input type="file" hidden onChange={handleFile} />
      </Button>
    </Box>
  );
}
