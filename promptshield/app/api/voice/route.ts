import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      )
    }

    console.log("[Voice API] Received audio file:", audioFile.name, "Size:", audioFile.size)

    // Create form data for backend
    const backendFormData = new FormData()
    backendFormData.append("file", audioFile)

    const startTime = Date.now()

    // Send to backend for transcription
    const response = await fetch(`${BACKEND_URL}/transcribe`, {
      method: "POST",
      body: backendFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Voice API] Backend error:", response.status, errorText)
      throw new Error(`Backend error: ${response.statusText}`)
    }

    const backendData = await response.json()
    const processingMs = Date.now() - startTime

    console.log("[Voice API] Transcription result:", backendData)

    return NextResponse.json({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      prompt: backendData.transcript,
      raw_prompt: backendData.transcript,
      sanitized_prompt: backendData.analysis?.sanitized || backendData.transcript,
      wrapped_prompt: backendData.analysis?.wrapped,
      scores: backendData.analysis?.scores || {},
      ppa_template_id: backendData.analysis?.template_id,
      confidence: backendData.confidence,
      processing_ms: backendData.analysis?.processing_ms || 0,
      client_ms: processingMs,
      transcript_source: "voice",
    })
  } catch (error) {
    console.error("[Voice API] Error:", error)
    return NextResponse.json(
      { error: `Failed to process voice: ${error}` },
      { status: 500 }
    )
  }
}
