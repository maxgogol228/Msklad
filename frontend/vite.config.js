import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // Это должно быть по умолчанию
    })
  ],
  base: "/",
  esbuild: {
    jsxInject: `import React from 'react'`, // Добавляет импорт React автоматически
  }
});
