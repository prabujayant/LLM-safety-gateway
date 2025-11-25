import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get("image") as File

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      )
    }

    console.log("[Image API] Received image:", imageFile.name, "Size:", imageFile.size)

    // Create form data for backend
    const backendFormData = new FormData()
    backendFormData.append("file", imageFile)

    const startTime = Date.now()

    // Send to backend for analysis
    const response = await fetch(`${BACKEND_URL}/analyze-image`, {
      method: "POST",
      body: backendFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Image API] Backend error:", response.status, errorText)
      throw new Error(`Backend error: ${response.statusText}`)
    }

    const backendData = await response.json()
    const processingMs = Date.now() - startTime

    console.log("[Image API] Analysis result:", backendData)

    return NextResponse.json({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      prompt: backendData.extracted_text,
      raw_prompt: backendData.extracted_text,
      sanitized_prompt: backendData.threat_analysis?.sanitized || backendData.extracted_text,
      wrapped_prompt: backendData.threat_analysis?.wrapped,
      scores: backendData.threat_analysis?.scores || {},
      ppa_template_id: backendData.threat_analysis?.template_id,
      confidence: backendData.ocr_confidence,
      processing_ms: backendData.threat_analysis?.scores?.processing_ms || 0,
      client_ms: processingMs,
      input_source: "image",
      image_analysis: backendData.image_analysis,
      analysis_metadata: backendData.image_analysis?.analysis_summary,
    })
  } catch (error) {
    console.error("[Image API] Error:", error)
    return NextResponse.json(
      { error: `Failed to process image: ${error}` },
      { status: 500 }
    )
  }
}
