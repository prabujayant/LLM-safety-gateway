"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function MetricsPanel({ lastResult }: { lastResult: any }) {
  if (!lastResult || !lastResult.scores) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No analysis yet.</p>
        </CardContent>
      </Card>
    )
  }

  const { scores } = lastResult
  const action = scores.action || "pass"
  
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "pass":
        return "text-green-600"
      case "sanitize":
        return "text-orange-600"
      case "block":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "pass":
        return "outline"
      case "sanitize":
        return "secondary"
      case "block":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getTotalScoreColor = (score: number) => {
    if (score >= 75) return "text-red-600"
    if (score >= 50) return "text-orange-600"
    if (score >= 25) return "text-yellow-600"
    return "text-green-600"
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Threat Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Score */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Risk Score</span>
              <span className={`text-2xl font-bold ${getTotalScoreColor(scores.total_score)}`}>
                {scores.total_score}
              </span>
            </div>
            <div className="w-full bg-black-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  scores.total_score >= 75
                    ? "bg-red-600"
                    : scores.total_score >= 50
                    ? "bg-orange-600"
                    : scores.total_score >= 25
                    ? "bg-yellow-600"
                    : "bg-green-600"
                }`}
                style={{ width: `${Math.min(100, scores.total_score)}%` }}
              />
            </div>
          </div>

          {/* Individual Scores */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-black-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">Regex Patterns</div>
              <div className="text-lg font-semibold">{scores.regex_score || 0}</div>
            </div>
            <div className="bg-black-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">Entropy</div>
              <div className="text-lg font-semibold">{scores.entropy_score || 0}</div>
            </div>
            <div className="bg-black-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">Keywords</div>
              <div className="text-lg font-semibold">{scores.keyword_score || 0}</div>
            </div>
            <div className="bg-black-50 p-3 rounded">
              <div className="text-xs text-muted-foreground">Anomaly</div>
              <div className="text-lg font-semibold">{scores.anomaly_score || 0}</div>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Recommended Action</span>
            <Badge variant={getActionBadgeVariant(action)}>
              {action.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {scores.insights && scores.insights.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <div className="font-semibold text-sm mb-2">Threat Indicators</div>
            <div className="space-y-1">
              {scores.insights.map((insight: string, idx: number) => (
                <div key={idx} className="text-sm">• {insight}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Indicators */}
      {scores.indicators && scores.indicators.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Detected Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {scores.indicators.map((indicator: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {indicator}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
