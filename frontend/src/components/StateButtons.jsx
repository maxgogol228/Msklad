import { Box, Button } from "@mui/material";

export default function StateButtons() {
  const copy = () => {
    const data = localStorage.getItem("state") || "{}";
    navigator.clipboard.writeText(data);
  };

  const load = () => {
    const txt = prompt("Вставь состояние");
    localStorage.setItem("state", txt);
    location.reload();
  };

  return (
    <Box position="fixed" bottom={10} right={10}>
      <Button size="small" onClick={copy}>скопировать сост.</Button>
      <Button size="small" onClick={load}>вставить сост.</Button>
    </Box>
  );
}
