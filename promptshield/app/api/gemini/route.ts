import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const errorMessage = error?.message || ""

      // Only retry on rate limit errors
      if (errorMessage.includes("429") || errorMessage.includes("rate") || errorMessage.includes("quota") || errorMessage.includes("Resource has been exhausted")) {
        const delay = initialDelay * Math.pow(2, i) // Exponential backoff: 1s, 2s, 4s
        console.log(`[Gemini] Rate limited, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`)
        await sleep(delay)
      } else {
        // Don't retry on other errors
        throw error
      }
    }
  }

  throw lastError
}

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

    // If blocked, return immediately
    if (action === "block") {
      return NextResponse.json({
        status: "blocked",
        response: "[BLOCKED] This prompt was blocked by PromptShield due to potential harmful content.",
        action: "block",
      })
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    // Use gemini-2.0-flash which should have better stability than exp
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Generate content with retry logic
    const generatedText = await retryWithBackoff(async () => {
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    }, 3, 4000) // 3 retries, starting with 4 second delay (4s, 8s, 16s)

    return NextResponse.json({
      status: "success",
      response: generatedText || "No response generated",
      action: action,
      promptUsed: action === "sanitize" ? "sanitized" : "original",
    })
  } catch (error: any) {
    console.error("Gemini error:", error)

    // Handle specific error types
    const errorMessage = error?.message || "Failed to process with Gemini"

    // Check for rate limiting (after retries exhausted)
    if (errorMessage.includes("429") || errorMessage.includes("rate") || errorMessage.includes("quota") || errorMessage.includes("Resource has been exhausted")) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded after retries. Please wait 1-2 minutes and try again.",
          details: "The Gemini API has rate limits. The system attempted automatic retries but the limit persists. Please wait a bit longer."
        },
        { status: 429 }
      )
    }

    // Check for invalid API key
    if (errorMessage.includes("401") || errorMessage.includes("API key") || errorMessage.includes("API_KEY_INVALID")) {
      return NextResponse.json(
        {
          error: "Invalid API key",
          details: "Please check your Gemini API key configuration."
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
