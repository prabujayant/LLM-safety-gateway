"use client"
export default function HistoryTable({ history }: { history: any[] }) {
  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Attack History (latest)</h3>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: ".85rem",
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Total</th>
              <th>Regex</th>
              <th>Entropy</th>
              <th>Anomaly</th>
              <th>Latency (ms)</th>
              <th>Template</th>
            </tr>
          </thead>

          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.id}</td>
                <td>{h.timestamp}</td>
                <td>{h.scores?.action || h.action}</td>
                <td>{h.scores?.total_score || h.total_score}</td>
                <td>{h.scores?.regex_score || h.regex_score}</td>
                <td>{h.scores?.entropy_score || h.entropy_score}</td>
                <td>{h.scores?.anomaly_score || h.anomaly_score}</td>
                <td>{h.processing_ms?.toFixed(2) || h.processing_ms}</td>
                <td>{h.ppa_template_id || "-"}</td>
              </tr>
            ))}

            {history.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center" }}>
                  No history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
