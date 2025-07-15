"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Youtube, Copy, RotateCcw, CheckCircle, AlertCircle, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageCircle, Bot, User } from "lucide-react"

interface TranscriptItem {
  text: string
  start: number
  duration: number
}

interface TranscriptResponse {
  transcript: TranscriptItem[]
  video_title?: string
  video_id?: string
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function YouTubeTranscriptExtractor() {
  const [url, setUrl] = useState("")
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const isValidYouTubeUrl = (url: string): boolean => {
    return extractVideoId(url) !== null
  }

  const handleExtractTranscript = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL")
      return
    }

    if (!isValidYouTubeUrl(url)) {
      setError("Please enter a valid YouTube URL")
      return
    }

    setLoading(true)
    setError("")
    setTranscript(null)

    try {
      const response = await fetch("/api/extract-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract transcript")
      }

      setTranscript(data)
      toast({
        title: "Success!",
        description: "Transcript extracted successfully",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      toast({
        title: "Error",
        description: "Failed to extract transcript",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyTranscript = async () => {
    if (!transcript?.transcript) return

    const transcriptText = transcript.transcript.map((item) => item.text).join(" ")

    try {
      await navigator.clipboard.writeText(transcriptText)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Transcript copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy transcript",
        variant: "destructive",
      })
    }
  }

  const handleClear = () => {
    setUrl("")
    setTranscript(null)
    setError("")
    setCopied(false)
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !transcript || chatLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setChatLoading(true)

    try {
      const response = await fetch("/api/chat-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: chatInput.trim(),
          transcript: transcript.transcript,
          videoTitle: transcript.video_title || "YouTube Video",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response")
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])

      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      })
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startNewChat = () => {
    setChatMessages([])
    setShowChat(true)
    toast({
      title: "Chat Started",
      description: "You can now ask questions about the transcript",
    })
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-red-600 rounded-full">
              <Youtube className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">YouTube Transcript Extractor</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Extract transcripts from any YouTube video instantly. Simply paste the video URL and get the full transcript
            with timestamps.
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-8 shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-600" />
              Extract Transcript
            </CardTitle>
            <CardDescription>Paste a YouTube video URL to extract its transcript</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12 text-lg"
                disabled={loading}
              />
              <Button
                onClick={handleClear}
                variant="outline"
                size="icon"
                className="h-12 w-12 bg-transparent"
                disabled={loading || !url}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleExtractTranscript}
              disabled={loading || !url}
              className="w-full h-12 text-lg bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Extracting Transcript...
                </>
              ) : (
                <>
                  <Youtube className="w-5 h-5 mr-2" />
                  Extract Transcript
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {transcript && (
          <div className="space-y-6">
            {/* Transcript Display */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Transcript Extracted
                    </CardTitle>
                    {transcript.video_title && (
                      <CardDescription className="mt-1 font-medium">{transcript.video_title}</CardDescription>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={startNewChat}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-medium">Chat with AI</span>
                    </Button>
                    <Button
                      onClick={handleCopyTranscript}
                      variant="outline"
                      className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 px-6 py-2.5"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="font-medium">Copy Text</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Plain Text Transcript */}
                  <div>
                    <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Transcript
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {transcript.transcript.map((item) => item.text).join(" ")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Section */}
            {showChat && (
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Bot className="w-5 h-5 text-blue-600" />
                    AI Chat Assistant
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Ask questions about the video content. I'll provide accurate answers based on the transcript.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Chat Messages */}
                    <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-gray-50">
                      {chatMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <Bot className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>Start a conversation about the transcript!</p>
                            <p className="text-sm mt-1">Ask me anything about the video content.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`flex gap-2 max-w-[80%] ${
                                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    message.role === "user" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                                  }`}
                                >
                                  {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div
                                  className={`rounded-lg p-3 ${
                                    message.role === "user" ? "bg-red-600 text-white" : "bg-white border shadow-sm"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed">{message.content}</p>
                                  <p
                                    className={`text-xs mt-1 ${
                                      message.role === "user" ? "text-red-100" : "text-gray-500"
                                    }`}
                                  >
                                    {message.timestamp.toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {chatLoading && (
                            <div className="flex gap-3 justify-start">
                              <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                                  <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-white border shadow-sm rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span className="text-sm text-gray-600">Thinking...</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>

                    {/* Chat Input */}
                    <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about this video..."
                        className="flex-1 min-h-[60px] max-h-[120px] resize-none border-2 border-gray-200 focus:border-blue-400 bg-white"
                        disabled={chatLoading}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        className="h-[60px] px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>Built with Next.js • Extract transcripts from any YouTube video</p>
        </div>
      </div>
    </div>
  )
}
