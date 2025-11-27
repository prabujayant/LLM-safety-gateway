import { type NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      )
    }

    const { prompt, action } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Use sanitized prompt if action is sanitize, otherwise use original
    const textToSend = action === "block" 
      ? null 
      : prompt

    if (action === "block") {
      return NextResponse.json({
        status: "blocked",
        response: "[BLOCKED] This prompt was blocked by PromptShield due to potential harmful content.",
        action: "block",
      })
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: textToSend,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Gemini API error:", error)
      return NextResponse.json(
        { error: `Gemini API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated"

    return NextResponse.json({
      status: "success",
      response: generatedText,
      action: action,
      promptUsed: action === "sanitize" ? "sanitized" : "original",
    })
  } catch (error) {
    console.error("Gemini error:", error)
    return NextResponse.json(
      { error: "Failed to process with Gemini" },
      { status: 500 }
    )
  }
}
