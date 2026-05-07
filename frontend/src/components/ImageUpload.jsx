import { useState } from "react";

export default function ImageUpload({ value, onChange }) {
  const [preview, setPreview] = useState(value || null);

  const toBase64 = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });

  const handleFile = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await toBase64(file);
    setPreview(base64);
    onChange && onChange(base64);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
      <button 
        onClick={() => document.getElementById('file-input').click()}
        style={{
          padding: "5px 10px",
          background: "#333",
          color: "#fff",
          border: "1px solid #555",
          cursor: "pointer"
        }}
      >
        Загрузить
      </button>
      <input 
        id="file-input"
        type="file" 
        hidden 
        onChange={handleFile} 
      />
    </div>
  );
}
