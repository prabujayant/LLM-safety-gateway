"use client"
export default function MetricsPanel({ lastResult }: { lastResult: any }) {
  if (!lastResult || !lastResult.scores) {
    return (
      <div>
        <h3>Risk Scores</h3>
        <p>No analysis yet.</p>
      </div>
    )
  }

  const { scores } = lastResult

  const color = (scores.action || "pass") === "pass" ? "green" : (scores.action || "pass") === "sanitize" ? "orange" : "red"

  return (
    <div>
      <h3>Risk Scores</h3>

      <div
        style={{
          border: "1px solid #ddd",
          padding: ".75rem",
          borderRadius: ".5rem",
        }}
      >
        <div>Total: {scores.total_score} / 100</div>
        <div>Regex: {scores.regex_score}</div>
        <div>Entropy: {scores.entropy_score}</div>
        <div>Anomaly: {scores.anomaly_score}</div>

        <div style={{ marginTop: ".5rem" }}>
          Action: <span style={{ fontWeight: "bold", color }}>{(scores.action || "pass").toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}
