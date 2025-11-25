"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code2 } from "lucide-react"

interface DeveloperModePanelProps {
  threatData: any
}

export default function DeveloperModePanel({ threatData }: DeveloperModePanelProps) {
  if (!threatData) return null

  const mockMetrics = {
    tfIdfVector: [0.85, 0.72, 0.91, 0.68, 0.45],
    entropyScore: 5.23,
    anomalyScore: 0.87,
    regexMatches: ["jailbreak_v1", "prompt_injection_v2"],
    unicodeNormalization: "NFC",
    base64Decoded: "dGVzdCBkYXRh",
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          Developer Mode
        </CardTitle>
        <CardDescription>Deep inspection of threat detection internals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* TF-IDF Vector */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              TF-IDF Vector Preview
            </p>
            <div className="font-mono text-sm space-y-1">
              {mockMetrics.tfIdfVector.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-muted-foreground">[{idx}]</span>
                  <div className="flex-1 h-4 bg-input rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${val * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-primary">{val.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Anomaly Scores */}
          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Anomaly Metrics</p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span>Entropy Score</span>
                <span className="text-accent">{mockMetrics.entropyScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Forest Score</span>
                <span className="text-accent">{mockMetrics.anomalyScore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Unicode Normalization</span>
                <span className="text-accent">{mockMetrics.unicodeNormalization}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regex Matches */}
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Regex Pattern Matches
          </p>
          <div className="space-y-2">
            {mockMetrics.regexMatches.map((match, idx) => (
              <div
                key={idx}
                className="px-3 py-2 rounded bg-destructive/10 border border-destructive/20 font-mono text-sm"
              >
                {match}
              </div>
            ))}
          </div>
        </div>

        {/* Base64 Decoding */}
        <div className="p-4 rounded-lg bg-muted/5 border border-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Base64 Decoded</p>
          <div className="font-mono text-sm bg-input px-3 py-2 rounded">{mockMetrics.base64Decoded}</div>
        </div>

        <p className="text-xs text-muted-foreground italic pt-4 border-t border-border/30">
          These metrics represent the internal detection pipeline. Real deployments would show actual analysis results.
        </p>
      </CardContent>
    </Card>
  )
}
