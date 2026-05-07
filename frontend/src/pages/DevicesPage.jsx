// В таблице приборов замените колонку "Состав" на:
<td style={{ padding: "12px", color: "#fff", maxWidth: "300px" }}>
  {d.items && d.items.length > 0 ? (
    <details style={{ color: "#aaa" }}>
      <summary style={{ cursor: "pointer", color: "#4a9eff", fontSize: "14px" }}>
        Состав ({d.items.length} поз.)
      </summary>
      <div style={{ marginTop: "8px", paddingLeft: "16px" }}>
        {d.items.map(i => (
          <div key={i.id} style={{ 
            fontSize: "13px",
            marginBottom: "6px",
            padding: "4px 8px",
            background: "#333",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "space-between"
          }}>
            <span>
              {i.item_type === 'consumable' ? '🔧' : '🔩'} {i.name}
            </span>
            <span style={{ fontWeight: "bold" }}>x{i.quantity}</span>
            {i.available_quantity !== undefined && i.available_quantity < i.quantity && (
              <span style={{ color: "#ff4444" }}>⚠️</span>
            )}
          </div>
        ))}
      </div>
    </details>
  ) : (
    <span style={{ color: "#666" }}>Пусто</span>
  )}
</td>
