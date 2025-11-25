"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"

interface ThreatResultPanelProps {
  data: any
  developerMode?: boolean
}

export default function ThreatResultPanel({ data, developerMode }: ThreatResultPanelProps) {
  if (!data) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Threat Result</CardTitle>
          <CardDescription>Submit a prompt to see threat analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No analysis yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Map action to status display
  const action = data.scores?.action || "pass"
  const statusMap: { [key: string]: "safe" | "sanitized" | "blocked" } = {
    pass: "safe",
    sanitize: "sanitized",
    block: "blocked",
  }
  const status = statusMap[action] || "safe"

  const statusConfig = {
    safe: {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      label: "Safe",
    },
    sanitized: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      label: "Sanitized",
    },
    blocked: {
      icon: AlertCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      label: "Blocked",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon
  const riskScore = data.scores?.total_score || 0

  return (
    <Card className={`border-border/50 bg-card/50 backdrop-blur-sm border-2 ${config.border}`}>
      <CardHeader>
        <CardTitle>Threat Analysis Result</CardTitle>
        <CardDescription>Real-time threat detection output</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className={`flex items-center gap-3 p-4 rounded-lg ${config.bg} border ${config.border}`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
          <div>
            <p className="font-semibold">{config.label}</p>
            <p className="text-sm text-muted-foreground">Prompt analysis complete</p>
          </div>
        </div>

        {/* Risk Score */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Risk Score</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-input rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  riskScore > 80 ? "bg-destructive" : riskScore > 50 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${riskScore}%` }}
              ></div>
            </div>
            <span className="text-lg font-bold">{riskScore}/100</span>
          </div>
        </div>

        {/* Detection Scores */}
        {data.scores && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Detection Breakdown</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-input/30">
                <span>Regex Score</span>
                <span className="font-mono font-bold">{data.scores.regex_score}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-input/30">
                <span>Entropy Score</span>
                <span className="font-mono font-bold">{data.scores.entropy_score}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-input/30">
                <span>Anomaly Score</span>
                <span className="font-mono font-bold">{data.scores.anomaly_score}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sanitized Version */}
        {action === "sanitize" && data.sanitized_prompt && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Sanitized Prompt</p>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm font-mono text-foreground max-h-24 overflow-y-auto">
              {data.sanitized_prompt}
            </div>
          </div>
        )}

        {/* Wrapped Version */}
        {data.wrapped_prompt && action !== "block" && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Wrapped Prompt (PPA)</p>
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm font-mono text-foreground max-h-24 overflow-y-auto">
              {data.wrapped_prompt}
            </div>
          </div>
        )}

        {/* Processing Time */}
        {data.processing_ms && (
          <div className="text-xs text-muted-foreground p-2 bg-input/30 rounded">
            ⏱️ Processing time: {data.processing_ms.toFixed(2)}ms
          </div>
        )}
      </CardContent>
    </Card>
  )
}
