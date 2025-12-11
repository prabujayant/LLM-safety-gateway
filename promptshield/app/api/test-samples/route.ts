import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/test-samples`, { next: { revalidate: 0 } }) // no cache

        if (!response.ok) {
            // Fallback if backend endpoint not ready
            return NextResponse.json({ samples: ["Test sample 1 (fallback)", "Test sample 2 (fallback)"] })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch samples" }, { status: 500 })
    }
}
