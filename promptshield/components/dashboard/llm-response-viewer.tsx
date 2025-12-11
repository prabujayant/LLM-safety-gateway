"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Send } from "lucide-react"

interface LLMResponseViewerProps {
  threatData: any
}

export default function LLMResponseViewer({ threatData }: LLMResponseViewerProps) {
  const [llmResponse, setLlmResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendToLLM = async () => {
    if (!threatData) return

    setLoading(true)
    setError(null)

    try {
      // Determine which prompt to send based on action
      let promptToSend = threatData.raw_prompt || threatData.prompt
      const action = threatData.scores?.action || "pass"

      if (action === "sanitize" && threatData.sanitized_prompt) {
        promptToSend = threatData.sanitized_prompt
      }

      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          action: action,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Show detailed error message
        if (errorData.details) {
          throw new Error(`${errorData.error}\n\n${errorData.details}`)
        }

        throw new Error(errorData.error || "Failed to get LLM response")
      }

      const result = await response.json()
      setLlmResponse(result)
    } catch (err) {
      console.error("LLM error:", err)
      setError(err instanceof Error ? err.message : "Failed to send to Local LLM")
    } finally {
      setLoading(false)
    }
  }

  if (!threatData)
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>LLM Response</CardTitle>
          <CardDescription>Send prompt to Local LLM to see response</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Submit a prompt to enable Local LLM integration</p>
          </div>
        </CardContent>
      </Card>
    )

  const action = threatData.scores?.action || "pass"
  const isBlocked = action === "block"

  // Check if we have an auto-forwarded LLM response
  const autoResponse = threatData.llm_response
  const hasResponse = autoResponse || llmResponse

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>LLM Response (Ollama)</CardTitle>
        <CardDescription>
          {isBlocked
            ? "Prompt blocked - Cannot send to LLM"
            : autoResponse
              ? "✅ Safe prompt - Auto-forwarded to Ollama"
              : action === "sanitize"
                ? "Sanitized prompt - Ready to send to LLM"
                : "Safe prompt - Ready to send to LLM"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show auto-forwarded response immediately */}
        {autoResponse && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2 text-primary">🚀 Auto-forwarded Response</p>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/30 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {autoResponse}
              </div>
            </div>
          </div>
        )}

        {/* Manual send button (only if not auto-forwarded and not blocked) */}
        {!autoResponse && !isBlocked && (
          <Button
            onClick={handleSendToLLM}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending to Ollama...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to Local LLM
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Manual LLM Response */}
        {llmResponse && !autoResponse && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2 text-primary">Ollama Response</p>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/30 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {llmResponse.status === "blocked" ? (
                  <span className="text-destructive font-semibold">{llmResponse.response}</span>
                ) : (
                  llmResponse.response
                )}
              </div>
            </div>

            {llmResponse.promptUsed && (
              <div className="text-xs text-muted-foreground p-2 bg-input/50 rounded">
                📝 Using {llmResponse.promptUsed} prompt
                {action === "sanitize" && " (sanitized for safety)"}
              </div>
            )}
          </div>
        )}

        {isBlocked && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm font-semibold text-destructive mb-1">Blocked Prompt</p>
            <p className="text-xs text-destructive/70">
              This prompt was blocked by PromptShield due to potential harmful content. It cannot be sent to the LLM.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
