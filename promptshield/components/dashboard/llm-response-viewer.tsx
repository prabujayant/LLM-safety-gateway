"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Send } from "lucide-react"

interface LLMResponseViewerProps {
  threatData: any
}

export default function LLMResponseViewer({ threatData }: LLMResponseViewerProps) {
  const [geminiResponse, setGeminiResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendToGemini = async () => {
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

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          action: action,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Show detailed error message with retry info
        if (errorData.details) {
          throw new Error(`${errorData.error}\n\n${errorData.details}`)
        }

        throw new Error(errorData.error || "Failed to get Gemini response")
      }

      const result = await response.json()
      setGeminiResponse(result)
    } catch (err) {
      console.error("Gemini error:", err)
      setError(err instanceof Error ? err.message : "Failed to send to Gemini")
    } finally {
      setLoading(false)
    }
  }

  if (!threatData)
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>LLM Response</CardTitle>
          <CardDescription>Send prompt to Gemini to see response</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Submit a prompt to enable Gemini integration</p>
          </div>
        </CardContent>
      </Card>
    )

  const action = threatData.scores?.action || "pass"
  const isBlocked = action === "block"

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Send to Gemini</CardTitle>
        <CardDescription>
          {isBlocked
            ? "Prompt blocked - Cannot send to LLM"
            : action === "sanitize"
              ? "Sending sanitized prompt to Gemini"
              : "Prompt is safe - Sending to Gemini"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Send Button */}
        <Button
          onClick={handleSendToGemini}
          disabled={isBlocked || loading}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending to Gemini...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send to Gemini
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Gemini Response */}
        {geminiResponse && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2 text-primary">Gemini Response</p>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/30 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {geminiResponse.status === "blocked" ? (
                  <span className="text-destructive font-semibold">{geminiResponse.response}</span>
                ) : (
                  geminiResponse.response
                )}
              </div>
            </div>

            {geminiResponse.promptUsed && (
              <div className="text-xs text-muted-foreground p-2 bg-input/50 rounded">
                📝 Using {geminiResponse.promptUsed} prompt
                {action === "sanitize" && " (sanitized for safety)"}
              </div>
            )}
          </div>
        )}

        {isBlocked && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm font-semibold text-destructive mb-1">Blocked Prompt</p>
            <p className="text-xs text-destructive/70">
              This prompt was blocked by PromptShield due to potential harmful content. It cannot be sent to Gemini.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
