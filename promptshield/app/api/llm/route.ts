import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
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

        // Call Ollama
        // We use llama3.2 (3B) for faster CPU inference compared to llama3:8b
        const modelName = "llama3.2"

        try {
            const response = await fetch("http://127.0.0.1:11434/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: modelName,
                    prompt: prompt,
                    stream: false
                }),
            })

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`)
            }

            const data = await response.json()

            return NextResponse.json({
                status: "success",
                response: data.response || "No response generated",
                action: action,
                promptUsed: action === "sanitize" ? "sanitized" : "original",
            })

        } catch (fetchError: any) {
            console.error("Connection to Ollama failed:", fetchError)

            if (fetchError?.cause?.code === "ECONNREFUSED") {
                return NextResponse.json(
                    {
                        error: "Ollama is not running",
                        details: "Please make sure Ollama is running on your machine (http://localhost:11434)."
                    },
                    { status: 503 }
                )
            }

            return NextResponse.json(
                { error: `Failed to connect to Local LLM: ${fetchError.message}` },
                { status: 500 }
            )
        }

    } catch (error: any) {
        console.error("API Route error:", error)
        return NextResponse.json(
            { error: error?.message || "Internal Server Error" },
            { status: 500 }
        )
    }
}
