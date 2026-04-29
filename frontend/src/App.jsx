import React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

// главный layout (sidebar + topbar + страницы)
import Layout from "./layout/Layout";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* сброс стандартных браузерных стилей */}
      <CssBaseline />

      {/* основной интерфейс */}
      <Layout />
    </ThemeProvider>
  );
}
