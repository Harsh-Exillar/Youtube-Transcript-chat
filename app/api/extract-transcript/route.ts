import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 })
    }

    // Extract video ID for validation
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    if (!videoIdMatch) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
    }

    const apiUrl = new URL("https://youtube-2-transcript.p.rapidapi.com/transcript-with-url")
    apiUrl.searchParams.append("url", url)
    apiUrl.searchParams.append("flat_text", "false")

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-host": "youtube-2-transcript.p.rapidapi.com",
        "x-rapidapi-key": "ffc936450dmshc2e2b7307f68378p186232jsna42db549b51e",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("RapidAPI Error:", response.status, errorText)

      if (response.status === 404) {
        return NextResponse.json({ error: "No transcript available for this video" }, { status: 404 })
      }

      if (response.status === 429) {
        return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
      }

      return NextResponse.json({ error: "Failed to fetch transcript from YouTube" }, { status: response.status })
    }

    const data = await response.json()

    if (!data.transcript || !Array.isArray(data.transcript)) {
      return NextResponse.json({ error: "No transcript data found for this video" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Transcript extraction error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
