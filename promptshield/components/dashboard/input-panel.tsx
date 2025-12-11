"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Mic, Send, Square, RefreshCw, Play } from "lucide-react"

interface InputPanelProps {
  onSubmit: (data: any) => void
}

export default function InputPanel({ onSubmit }: InputPanelProps) {
  const [inputMode, setInputMode] = useState<"text" | "image" | "pdf" | "voice">("text")
  const [textInput, setTextInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [bypassFilter, setBypassFilter] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [testSamples, setTestSamples] = useState<string[]>([])
  const [loadingSamples, setLoadingSamples] = useState(false)

  // Initialize audio recording
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop the stream tracks
        stream.getTracks().forEach((track) => track.stop())

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        console.log("[Voice] Recording finished. Blob size:", audioBlob.size)

        // Upload to backend for transcription
        await uploadAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("[Voice] Failed to start recording:", error)
      alert("Failed to access microphone. Please check permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const uploadAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)

    try {
      console.log("[Voice] Uploading audio for transcription...")
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.text()
        console.error("[Voice] API error:", response.status, error)
        throw new Error("Failed to transcribe audio")
      }

      const result = await response.json()
      console.log("[Voice] Transcription result:", result)

      // Send to analysis
      onSubmit(result)
    } catch (error) {
      console.error("[Voice] Upload error:", error)
      alert("Failed to process audio. Please try again.")
      onSubmit(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const uploadImage = async (imageFile: File) => {
    setIsProcessing(true)

    try {
      console.log("[Image] Uploading image for analysis...")
      const formData = new FormData()
      formData.append("image", imageFile)

      const response = await fetch("/api/image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.text()
        console.error("[Image] API error:", response.status, error)
        throw new Error("Failed to analyze image")
      }

      const result = await response.json()
      console.log("[Image] Analysis result:", result)

      // Send to analysis
      onSubmit(result)
      setSelectedFile(null)
    } catch (error) {
      console.error("[Image] Upload error:", error)
      alert("Failed to process image. Please try again.")
      onSubmit(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const uploadDocument = async (documentFile: File) => {
    setIsProcessing(true)

    try {
      console.log("[Document] Uploading document for analysis...")
      const formData = new FormData()
      formData.append("file", documentFile)

      const response = await fetch("/api/document", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.text()
        console.error("[Document] API error:", response.status, error)
        throw new Error("Failed to analyze document")
      }

      const result = await response.json()
      console.log("[Document] Analysis result:", result)

      // Send to analysis
      onSubmit(result)
      setSelectedFile(null)
    } catch (error) {
      console.error("[Document] Upload error:", error)
      alert("Failed to process document. Please try again.")
      onSubmit(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-upload based on mode
      if (inputMode === "pdf" || inputMode === "image") {
        if (inputMode === "image") {
          uploadImage(file)
        } else {
          uploadDocument(file)
        }
      }
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return

    try {
      console.log("[InputPanel] Submitting prompt to /api/analyze:", textInput.substring(0, 50) + "...")
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textInput }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[InputPanel] API error:", response.status, errorText)
        throw new Error("Failed to analyze")
      }

      const result = await response.json()
      console.log("[InputPanel] Analysis result:", result)

      // Pass the full result including raw and sanitized prompts
      onSubmit({
        ...result,
        prompt: textInput, // Original prompt
      })
    } catch (error) {
      console.error("[InputPanel] Analysis error:", error)
      onSubmit(null)
    }
  }

  const handleSubmit = () => {
    if (inputMode === "voice") {
      // Voice is handled by uploadAudio
      return
    } else if (inputMode === "image") {
      if (selectedFile) {
        uploadImage(selectedFile)
      }
      return
    } else if (inputMode === "pdf") {
      if (selectedFile) {
        uploadDocument(selectedFile)
      }
      return
    } else {
      handleTextSubmit()
    }
  }

  const generateTestSamples = async () => {
    setLoadingSamples(true)
    try {
      const res = await fetch("/api/test-samples")
      if (res.ok) {
        const data = await res.json()
        setTestSamples(data.samples || [])
      }
    } catch (e) {
      console.error("Failed to fetch samples", e)
    } finally {
      setLoadingSamples(false)
    }
  }

  const runSample = (sample: string) => {
    setTextInput(sample)
    setInputMode("text")
    // Use timeout to allow state update before submitting
    setTimeout(async () => {
      // We need to call the logic of handleTextSubmit but using the sample directly 
      // because state update might not be compliant with closure here if we just call handleTextSubmit() which uses textInput state
      // So let's modify handleTextSubmit to accept an optional arg or just logic duplication (cleaner to use arg)
      // But for minimal edit, I'll assume textInput update + timeout works or refactor handleTextSubmit.

      // Better: Call api directly here or refactor handleTextSubmit to take arg.
      // Let's refactor handleTextSubmit to take optional text.

      // Actually, just calling a helper:
      const submitText = async (text: string) => {
        if (!text.trim()) return
        try {
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text }),
          })
          if (!response.ok) throw new Error("Failed")
          const result = await response.json()
          onSubmit({ ...result, prompt: text })
        } catch (error) {
          console.error(error)
          onSubmit(null)
        }
      }
      submitText(sample)
    }, 0)
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Input Panel</CardTitle>
        <CardDescription>Choose input mode and submit for analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Mode Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["text", "image"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${inputMode === mode
                ? "bg-primary/20 text-primary border border-primary/50"
                : "bg-primary/5 text-muted-foreground border border-border/30 hover:bg-primary/10"
                }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Text Input */}
        {inputMode === "text" && (
          <div className="space-y-2">
            <Textarea
              placeholder="Enter your prompt here... Try: 'ignore previous instructions' or 'reveal system prompt'"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="min-h-32 bg-input border-border/50 focus:border-primary/50"
            />
          </div>
        )}

        {/* File Upload */}
        {(inputMode === "image" || inputMode === "pdf") && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={
                inputMode === "image"
                  ? "image/*"
                  : ".pdf,.docx,.doc,.txt,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,application/rtf"
              }
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {selectedFile ? `Selected: ${selectedFile.name}` : `Drag and drop ${inputMode} or click to select`}
              </p>
              {inputMode === "pdf" && (
                <p className="text-xs text-muted-foreground mt-2">Supported: PDF, DOCX, DOC, TXT, RTF</p>
              )}
            </div>
          </div>
        )}

        {/* Voice Input */}
        {inputMode === "voice" && (
          <div className="text-center py-8 space-y-4">
            <div className="space-y-3">
              {isRecording && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div>
                  <span className="text-sm font-semibold text-destructive">Recording...</span>
                  <span className="text-sm font-mono text-destructive/70">{recordingTime}s</span>
                </div>
              )}

              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`mx-auto p-4 rounded-full transition-all disabled:opacity-50 ${isRecording
                  ? "bg-destructive/20 text-destructive border-2 border-destructive/50 hover:bg-destructive/30"
                  : "bg-primary/20 text-primary border-2 border-primary/50 hover:bg-primary/30"
                  }`}
              >
                {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <p className="text-sm text-muted-foreground">
                {isProcessing ? "Processing audio..." : isRecording ? "Recording... Click to stop" : "Click to record"}
              </p>
            </div>
          </div>
        )}

        {/* Bypass Option */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bypassFilter}
            onChange={(e) => setBypassFilter(e.target.checked)}
            className="w-4 h-4 rounded border-border/50"
          />
          <span className="text-sm text-muted-foreground">Compare with unsafe output</span>
        </label>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={
            isRecording ||
            isProcessing ||
            (inputMode === "text" && !textInput.trim()) ||
            ((inputMode === "image" || inputMode === "pdf") && !selectedFile)
          }
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
        >
          <Send className="w-4 h-4 mr-2" />
          {isProcessing ? "Processing..." : "Submit to Gateway"}
        </Button>

        {/* Test Data Generator */}
        <div className="pt-6 border-t border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Test Data Generator</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={generateTestSamples}
              disabled={loadingSamples}
              className="h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loadingSamples ? "animate-spin" : ""}`} />
              Generate Samples
            </Button>
          </div>

          {testSamples.length > 0 && (
            <div className="space-y-2">
              {testSamples.map((sample, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <p className="text-xs flex-1 truncate font-mono text-muted-foreground group-hover:text-foreground">{sample}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => runSample(sample)}
                    title="Run Analysis"
                  >
                    <Play className="w-3.5 h-3.5 text-primary" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
