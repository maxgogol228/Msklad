export default function Sidebar({ setPage }) {
  return (
    <div style={{
      width: 220,
      background: "#111",
      height: "100vh",
      color: "#fff"
    }}>
      <div style={{ padding: 10 }}>
        <button 
          onClick={() => setPage("items")}
          style={buttonStyle}
        >
          Детали
        </button>
        <button 
          onClick={() => setPage("consumables")}
          style={buttonStyle}
        >
          Расходники
        </button>
        <button 
          onClick={() => setPage("devices")}
          style={buttonStyle}
        >
          Приборы
        </button>
      </div>
    </div>
  );
}

const buttonStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginBottom: "5px",
  background: "#333",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  textAlign: "left"
};
