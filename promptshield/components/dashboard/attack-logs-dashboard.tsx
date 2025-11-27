"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface AttackLog {
  id: number
  timestamp: string
  action: string
  total_score: number
  processing_ms: number
  regex_score: number
  entropy_score: number
  anomaly_score: number
  ppa_template_id: string | null
  raw_prompt: string
  sanitized_prompt: string
  wrapped_prompt: string
}

const COLORS = {
  triggers: {
    "Regex Pattern": "#ef4444",      // Red
    "Entropy": "#f59e0b",             // Amber
    "Anomaly": "#8b5cf6",             // Violet
  },
  actions: {
    "block": "#ef4444",               // Red
    "sanitize": "#f59e0b",            // Amber
    "pass": "#10b981",                // Green
  },
  scores: {
    regex: "#3b82f6",                 // Blue
    entropy: "#f59e0b",               // Amber
    anomaly: "#8b5cf6",               // Violet
    keyword: "#ec4899",               // Pink
  },
  chart: [
    "#ef4444",  // Red
    "#f59e0b",  // Amber
    "#10b981",  // Green
    "#3b82f6",  // Blue
    "#8b5cf6",  // Violet
    "#ec4899",  // Pink
  ]
}

const actionColorMap = {
  "block": { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-200" },
  "sanitize": { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200" },
  "pass": { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-200" },
}

interface AttackLogsDashboardProps {
  showAnalyticsOnly?: boolean
}

export default function AttackLogsDashboard({ showAnalyticsOnly }: AttackLogsDashboardProps) {
  const [logs, setLogs] = useState<AttackLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/analyze")
        if (!response.ok) throw new Error("Failed to fetch logs")
        const data = await response.json()
        setLogs(data.items || [])
      } catch (err) {
        console.error("Error fetching logs:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
    
    // Refresh logs every 3 seconds
    const interval = setInterval(fetchLogs, 3000)
    return () => clearInterval(interval)
  }, [])

  // Calculate statistics from logs
  const attackTypes = logs.reduce(
    (acc, log) => {
      const trigger =
        log.regex_score > log.entropy_score && log.regex_score > log.anomaly_score
          ? "Regex Pattern"
          : log.entropy_score > log.anomaly_score
            ? "Entropy"
            : "Anomaly"
      const existing = acc.find((t) => t.name === trigger)
      if (existing) existing.value++
      else acc.push({ name: trigger, value: 1 })
      return acc
    },
    [] as Array<{ name: string; value: number }>
  )

  const actionCounts = logs.reduce(
    (acc, log) => {
      const existing = acc.find((t) => t.name === log.action)
      if (existing) existing.value++
      else acc.push({ name: log.action, value: 1 })
      return acc
    },
    [] as Array<{ name: string; value: number }>
  )

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Detection Triggers Chart */}
        <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Detection Triggers</CardTitle>
            <CardDescription>Most common detection patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {attackTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attackTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {attackTypes.map((item, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS.triggers[item.name as keyof typeof COLORS.triggers] || COLORS.chart[idx]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--color-card))",
                      border: "2px solid hsl(var(--color-border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value) => `${value} detections`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Action Types Chart */}
        <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Action Distribution</CardTitle>
            <CardDescription>Detection actions taken</CardDescription>
          </CardHeader>
          <CardContent>
            {actionCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actionCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--color-muted-foreground))" />
                  <YAxis stroke="hsl(var(--color-muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--color-card))",
                      border: "2px solid hsl(var(--color-border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value) => [`${value} events`, "Count"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--color-chart-1))" radius={[8, 8, 0, 0]}>
                    {actionCounts.map((item, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS.actions[item.name as keyof typeof COLORS.actions] || COLORS.chart[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      {!showAnalyticsOnly && (
        <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Attack History</CardTitle>
            <CardDescription>All logged prompts and detections from database</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">Loading logs...</div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-destructive">Error: {error}</div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">No logs available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border/50 bg-muted/30">
                      <th className="text-left px-4 py-3 font-semibold text-foreground">ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Timestamp</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Action</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Risk Score</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Regex</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Entropy</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Anomaly</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Latency</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const getSeverityColor = (score: number) => {
                        if (score >= 75) return "bg-red-500/5 hover:bg-red-500/10"
                        if (score >= 50) return "bg-amber-500/5 hover:bg-amber-500/10"
                        if (score >= 25) return "bg-yellow-500/5 hover:bg-yellow-500/10"
                        return "bg-green-500/5 hover:bg-green-500/10"
                      }
                      
                      const getRiskColor = (score: number) => {
                        if (score >= 75) return "text-red-600 font-bold"
                        if (score >= 50) return "text-amber-600 font-bold"
                        if (score >= 25) return "text-yellow-600 font-bold"
                        return "text-green-600 font-bold"
                      }

                      return (
                        <>
                          <tr key={log.id} className={`border-b border-border/30 transition-colors cursor-pointer ${getSeverityColor(log.total_score)}`}
                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                          >
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.id}</td>
                            <td className="px-4 py-3 text-xs font-mono">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                  log.action === "block"
                                    ? "bg-red-500/10 text-red-600 border-red-200"
                                    : log.action === "sanitize"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                      : "bg-green-500/10 text-green-600 border-green-200"
                                }`}
                              >
                                {log.action.toUpperCase()}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm font-mono ${getRiskColor(log.total_score)}`}>
                              {log.total_score}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono">
                              <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded">{log.regex_score}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono">
                              <span className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded">{log.entropy_score}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono">
                              <span className="bg-violet-500/10 text-violet-600 px-2 py-1 rounded">{log.anomaly_score}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                              {log.processing_ms.toFixed(1)}ms
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedRow(expandedRow === log.id ? null : log.id)
                                }}
                                className="text-xs px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                              >
                                {expandedRow === log.id ? "Hide" : "View"}
                              </button>
                            </td>
                          </tr>
                          {expandedRow === log.id && (
                            <tr className="border-b border-border/30 bg-muted/50">
                              <td colSpan={9} className="px-4 py-4">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2 text-foreground">Raw Prompt</h4>
                                    <p className="text-xs bg-black/10 dark:bg-white/10 p-3 rounded-lg break-words text-muted-foreground">{log.raw_prompt}</p>
                                  </div>
                                  {log.sanitized_prompt && log.sanitized_prompt !== log.raw_prompt && (
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2 text-foreground">Sanitized Prompt</h4>
                                      <p className="text-xs bg-amber-500/10 p-3 rounded-lg break-words text-amber-700 dark:text-amber-300">{log.sanitized_prompt}</p>
                                    </div>
                                  )}
                                  {log.wrapped_prompt && log.wrapped_prompt !== log.raw_prompt && (
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2 text-foreground">Wrapped Prompt</h4>
                                      <p className="text-xs bg-green-500/10 p-3 rounded-lg break-words text-green-700 dark:text-green-300">{log.wrapped_prompt}</p>
                                    </div>
                                  )}
                                  {log.ppa_template_id && (
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2 text-foreground">PPA Template</h4>
                                      <p className="text-xs bg-blue-500/10 p-3 rounded-lg break-words text-blue-700 dark:text-blue-300 font-mono">{log.ppa_template_id}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
