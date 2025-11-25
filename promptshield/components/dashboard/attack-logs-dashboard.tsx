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

const COLORS = [
  "hsl(var(--color-chart-1))",
  "hsl(var(--color-chart-2))",
  "hsl(var(--color-chart-3))",
  "hsl(var(--color-chart-4))",
]

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
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Detection Triggers</CardTitle>
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
                    {attackTypes.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--color-card))",
                      border: "1px solid hsl(var(--color-border))",
                    }}
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
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Action Distribution</CardTitle>
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
                      border: "1px solid hsl(var(--color-border))",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--color-chart-1))" radius={[8, 8, 0, 0]} />
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
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Attack History (Latest)</CardTitle>
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
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Regex</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entropy</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Anomaly</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Latency (ms)</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Template</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <>
                        <tr key={log.id} className="border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        >
                          <td className="px-4 py-3 text-xs font-mono">{log.id}</td>
                          <td className="px-4 py-3 text-xs font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                log.action === "block"
                                  ? "bg-destructive/20 text-destructive"
                                  : log.action === "sanitize"
                                    ? "bg-yellow-500/20 text-yellow-600"
                                    : "bg-green-500/20 text-green-600"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">{log.total_score}</td>
                          <td className="px-4 py-3 text-xs font-mono">{log.regex_score}</td>
                          <td className="px-4 py-3 text-xs font-mono">{log.entropy_score}</td>
                          <td className="px-4 py-3 text-xs font-mono">{log.anomaly_score}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {log.processing_ms.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono">
                            {log.ppa_template_id || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedRow(expandedRow === log.id ? null : log.id)
                              }}
                              className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary"
                            >
                              {expandedRow === log.id ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>
                        {expandedRow === log.id && (
                          <tr className="border-b border-border/30 bg-primary/5">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-sm font-semibold mb-1">Raw Prompt</h4>
                                  <p className="text-xs bg-input/50 p-2 rounded break-words">{log.raw_prompt}</p>
                                </div>
                                {log.sanitized_prompt && log.sanitized_prompt !== log.raw_prompt && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-1">Sanitized Prompt</h4>
                                    <p className="text-xs bg-input/50 p-2 rounded break-words">{log.sanitized_prompt}</p>
                                  </div>
                                )}
                                {log.wrapped_prompt && log.wrapped_prompt !== log.raw_prompt && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-1">Wrapped Prompt</h4>
                                    <p className="text-xs bg-input/50 p-2 rounded break-words">{log.wrapped_prompt}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
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
