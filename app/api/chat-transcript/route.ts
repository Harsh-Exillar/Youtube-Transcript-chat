import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI("AIzaSyBwWJlPfhvo9gb6R4nW2KHFS01N1tvYVdQ")

interface TranscriptItem {
  text: string
  start: number
  duration: number
}

export async function POST(request: NextRequest) {
  try {
    const { message, transcript, videoTitle } = await request.json()

    if (!message || !transcript) {
      return NextResponse.json({ error: "Message and transcript are required" }, { status: 400 })
    }

    // Create the system prompt with transcript context
    const transcriptText = transcript.map((item: TranscriptItem) => item.text).join(" ")

    const systemPrompt = `You are an intelligent transcript assistant for a YouTube video titled "${videoTitle}". Your role is to help users understand and analyze the video content based EXCLUSIVELY on the provided transcript.

TRANSCRIPT CONTENT:
${transcriptText}

INSTRUCTIONS:
1. ACCURACY: Answer questions with 100% confidence and accuracy based ONLY on the transcript content
2. COMPREHENSIVE: Provide detailed, helpful answers that fully address the user's question
3. LIMITATIONS: If information is not available in the transcript, clearly state this limitation
4. CLARITY: Use clear, conversational language that's easy to understand
5. RELEVANCE: Stay focused on the video content and don't provide external information
6. ANALYSIS: Summarize, analyze, or explain concepts as needed based on the transcript

RESPONSE GUIDELINES:
- Be confident and authoritative about information that IS in the transcript
- Be honest about information that is NOT in the transcript
- Provide comprehensive explanations when needed
- Help users understand the video content better
- Answer follow-up questions based on previous context

EXAMPLE RESPONSES:
- "Based on the transcript, the speaker explains that..."
- "The video covers several main points: [detailed explanation]"
- "I don't see that specific information mentioned in this transcript, but the content does discuss..."

Remember: You are an expert at understanding and explaining this specific video's content. Be helpful, accurate, and confident in your responses.`

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    })

    const result = await model.generateContent(message)
    const response = await result.response
    const text = response.text()

    if (!text) {
      throw new Error("No response generated")
    }

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("Gemini API error:", error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) {
        return NextResponse.json({ error: "Invalid API key configuration" }, { status: 401 })
      }
      if (error.message.includes("QUOTA")) {
        return NextResponse.json({ error: "API quota exceeded. Please try again later." }, { status: 429 })
      }
      if (error.message.includes("SAFETY")) {
        return NextResponse.json(
          { error: "Content filtered for safety. Please rephrase your question." },
          { status: 400 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate response. Please try again.",
      },
      { status: 500 },
    )
  }
}
