import React from "react";
import { ThemeProvider } from "@mui/material";
import theme from "./theme";
import Layout from "./layout/Layout";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  );
}
