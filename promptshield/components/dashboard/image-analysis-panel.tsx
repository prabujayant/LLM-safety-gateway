"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Eye, FileText } from "lucide-react"

interface ImageAnalysisPanelProps {
  data: any
}

export default function ImageAnalysisPanel({ data }: ImageAnalysisPanelProps) {
  if (!data?.image_analysis) {
    return null
  }

  const analysis = data.image_analysis
  const summary = analysis.analysis_summary || {}
  const hidden = analysis.hidden_content_analysis || {}
  const metadata = analysis.metadata || {}

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Image Analysis Details
        </CardTitle>
        <CardDescription>OCR extraction and threat detection results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Summary */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="p-3 rounded-lg bg-input/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Text Confidence</p>
            <p className="text-lg font-bold">{summary.confidence || "0%"}</p>
          </div>
          <div className="p-3 rounded-lg bg-input/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Text Blocks Found</p>
            <p className="text-lg font-bold">{summary.text_blocks || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-input/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Risk Score</p>
            <p className="text-lg font-bold text-destructive">{Math.round(analysis.combined_risk_score || 0)}/100</p>
          </div>
          <div className="p-3 rounded-lg bg-input/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Suspicious Indicators</p>
            <p className="text-lg font-bold">{summary.suspicious_indicators || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-input/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Jailbreak Attempts</p>
            <p className="text-lg font-bold text-yellow-600">{summary.jailbreak_attempts || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-input/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Encoded Patterns</p>
            <p className="text-lg font-bold text-orange-600">{summary.encoded_patterns || 0}</p>
          </div>
        </div>

        {/* Extracted Text */}
        {data.extracted_text && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Extracted Text</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm font-mono text-foreground max-h-32 overflow-y-auto">
              {data.extracted_text}
            </div>
          </div>
        )}

        {/* Metadata */}
        {metadata && Object.keys(metadata).length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Image Metadata</p>
            <div className="space-y-2 text-xs">
              {metadata.width && (
                <div className="flex justify-between p-2 rounded bg-input/30">
                  <span>Dimensions</span>
                  <span className="font-mono">{metadata.width}x{metadata.height}</span>
                </div>
              )}
              {metadata.format && (
                <div className="flex justify-between p-2 rounded bg-input/30">
                  <span>Format</span>
                  <span className="font-mono">{metadata.format}</span>
                </div>
              )}
              {metadata.file_size && (
                <div className="flex justify-between p-2 rounded bg-input/30">
                  <span>File Size</span>
                  <span className="font-mono">{(metadata.file_size / 1024).toFixed(2)} KB</span>
                </div>
              )}
              {metadata.has_transparency && (
                <div className="flex justify-between p-2 rounded bg-yellow-500/10">
                  <span className="text-yellow-700">Has Transparency</span>
                  <span className="font-bold text-yellow-700">⚠️</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suspicious Indicators */}
        {metadata.suspicious_indicators && metadata.suspicious_indicators.length > 0 && (
          <div>
            <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Suspicious Indicators
            </p>
            <div className="space-y-1">
              {metadata.suspicious_indicators.map((indicator: string, idx: number) => (
                <div key={idx} className="text-xs p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive">
                  • {indicator}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jailbreak Attempts */}
        {hidden.jailbreak_attempts && hidden.jailbreak_attempts.length > 0 && (
          <div>
            <p className="text-sm font-medium text-yellow-700 mb-2">Detected Jailbreak Attempts</p>
            <div className="space-y-1">
              {hidden.jailbreak_attempts.map((phrase: string, idx: number) => (
                <div key={idx} className="text-xs p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-700">
                  • "{phrase}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Encoded Patterns */}
        {hidden.encoded_patterns && hidden.encoded_patterns.length > 0 && (
          <div>
            <p className="text-sm font-medium text-orange-700 mb-2">Encoded/Suspicious Patterns</p>
            <div className="space-y-1">
              {hidden.encoded_patterns.map((pattern: string, idx: number) => (
                <div key={idx} className="text-xs p-2 rounded bg-orange-500/10 border border-orange-500/30 text-orange-700">
                  • {pattern}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* URLs Found */}
        {hidden.suspicious_urls && hidden.suspicious_urls.length > 0 && (
          <div>
            <p className="text-sm font-medium text-blue-700 mb-2">URLs Detected</p>
            <div className="space-y-1">
              {hidden.suspicious_urls.map((url: string, idx: number) => (
                <div key={idx} className="text-xs p-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-700 break-all">
                  🔗 {url}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
