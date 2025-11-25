"use client"
export default function PPADemo({ lastResult }: { lastResult: any }) {
  if (!lastResult) return null

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Polymorphic Prompt Assembling (PPA)</h3>

      <p style={{ fontSize: ".9rem", opacity: 0.8 }}>Same sanitized content, different wrappers per request.</p>

      <pre
        style={{
          background: "#000000ff",
          padding: ".75rem",
          borderRadius: ".5rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {lastResult.wrapped_prompt || "(blocked – not wrapped)"}
      </pre>

      <div style={{ fontSize: ".8rem", marginTop: ".25rem" }}>Template ID: {lastResult.ppa_template_id || "n/a"}</div>
    </div>
  )
}
