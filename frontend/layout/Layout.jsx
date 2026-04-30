import { Box } from "@mui/material";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import ItemsPage from "../pages/ItemsPage";
import ConsumablesPage from "../pages/ConsumablesPage";
import DevicesPage from "../pages/DevicesPage";

import StateButtons from "../components/StateButtons";
import AntiDDOS from "../components/AntiDDOS";

export default function Layout() {
  const [page, setPage] = useState("items");

  return (
    <>
      <AntiDDOS />

      <Box display="flex">
        <Sidebar setPage={setPage} />

        <Box flex={1}>
          <Topbar />

          <Box p={2}>
            {page === "items" && <ItemsPage />}
            {page === "consumables" && <ConsumablesPage />}
            {page === "devices" && <DevicesPage />}
          </Box>
        </Box>
      </Box>

      <StateButtons />
    </>
  );
}
