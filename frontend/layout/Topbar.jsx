import { Box, Typography } from "@mui/material";

export default function Topbar() {
  return (
    <Box height={60} display="flex" alignItems="center" px={2} borderBottom="1px solid #333">
      <Typography variant="h6">М склад</Typography>
    </Box>
  );
}
