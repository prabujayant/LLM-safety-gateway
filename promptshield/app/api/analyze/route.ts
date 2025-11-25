import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const startTime = Date.now()

    // Call the backend API
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Backend error: ${response.statusText}`, errorText)
      throw new Error(`Backend error: ${response.statusText}`)
    }

    const backendData = await response.json()
    const processingMs = Date.now() - startTime

    return NextResponse.json({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      prompt,
      raw_prompt: backendData.raw_prompt || prompt,
      sanitized_prompt: backendData.sanitized_prompt || prompt,
      wrapped_prompt: backendData.wrapped_prompt,
      scores: backendData.scores,
      ppa_template_id: backendData.ppa_template_id,
      processing_ms: backendData.processing_ms,
      client_ms: processingMs,
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: `Failed to analyze prompt: ${error}` }, { status: 500 })
  }
}

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/history?limit=50`)

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("History fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch history", items: [] }, { status: 500 })
  }
}
