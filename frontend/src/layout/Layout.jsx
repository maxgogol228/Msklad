import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ItemsPage from "../pages/ItemsPage";
import DevicesPage from "../pages/DevicesPage";
import StateButtons from "../components/StateButtons";

export default function Layout() {
  const [page, setPage] = useState("items");

  return (
    <Box display="flex">
      <Sidebar setPage={setPage} />

      <Box flex={1}>
        <Topbar />

        <Box p={2}>
          {page === "items" && <ItemsPage />}
          {page === "devices" && <DevicesPage />}
        </Box>
      </Box>

      <StateButtons />
    </Box>
  );
}