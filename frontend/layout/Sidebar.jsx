import { Box, List, ListItemButton } from "@mui/material";

export default function Sidebar({ setPage }) {
  return (
    <Box width={220} bgcolor="#111" height="100vh">
      <List>
        <ListItemButton onClick={() => setPage("items")}>Детали</ListItemButton>
        <ListItemButton onClick={() => setPage("consumables")}>Расходники</ListItemButton>
        <ListItemButton onClick={() => setPage("devices")}>Приборы</ListItemButton>
      </List>
    </Box>
  );
}
