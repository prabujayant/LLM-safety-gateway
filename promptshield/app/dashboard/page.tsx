"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import InputPanel from "@/components/dashboard/input-panel"
import ThreatResultPanel from "@/components/dashboard/threat-result-panel"
import LLMResponseViewer from "@/components/dashboard/llm-response-viewer"
import AttackLogsDashboard from "@/components/dashboard/attack-logs-dashboard"
import DeveloperModePanel from "@/components/dashboard/developer-mode-panel"
import ImageAnalysisPanel from "@/components/dashboard/image-analysis-panel"
import { DocumentAnalysisPanel } from "@/components/dashboard/document-analysis-panel"
import MetricsPanel from "@/components/backend-components/metrics-panel"
import PPADemo from "@/components/backend-components/ppa-demo"
import HistoryTable from "@/components/backend-components/history-table"
import { Menu, X } from "lucide-react"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentTab, setCurrentTab] = useState("gateway")
  const [lastResult, setLastResult] = useState(null)
  const [history, setHistory] = useState<any[]>([])
  const [developerMode, setDeveloperMode] = useState(false)

  const handleAnalysis = (result: any) => {
    if (result) {
      setLastResult(result)
      setHistory([result, ...history.slice(0, 9)]) // Keep last 10 results
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-primary/10 rounded-lg lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PromptShield
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={developerMode}
                onChange={(e) => setDeveloperMode(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-muted-foreground">Dev Mode</span>
            </label>
            <Button variant="ghost" size="sm" className="rounded-lg">
              Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? "w-64" : "w-0"
            } border-r border-border/50 bg-sidebar/50 hidden lg:block lg:w-64 transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto`}
        >
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Menu</h3>
              <div className="space-y-2">
                {[
                  { id: "gateway", label: "Gateway Tester" },
                  { id: "logs", label: "Attack Logs" },
                  { id: "analytics", label: "Analytics" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${currentTab === item.id
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-muted-foreground hover:bg-primary/10"
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-border/30">


            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            {currentTab === "gateway" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Gateway Tester</h1>
                  <p className="text-muted-foreground">Test PromptShield with your prompts</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <InputPanel onSubmit={handleAnalysis} />
                  <div className="space-y-6">
                    <ThreatResultPanel data={lastResult} developerMode={developerMode} />
                    {lastResult?.image_analysis && <ImageAnalysisPanel data={lastResult} />}
                    {lastResult?.documentAnalysis && <DocumentAnalysisPanel data={lastResult} />}
                    {/* Hide MetricsPanel and PPA for image analysis */}
                    {lastResult && lastResult.input_source !== "image" && (
                      <>
                        <MetricsPanel lastResult={lastResult} />
                        <PPADemo lastResult={lastResult} />
                      </>
                    )}
                  </div>
                </div>

                <LLMResponseViewer threatData={lastResult} />

                {developerMode && <DeveloperModePanel threatData={lastResult} />}
              </div>
            )}

            {currentTab === "logs" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Attack Logs</h1>
                  <p className="text-muted-foreground">View all detected threats and attacks</p>
                </div>
                <AttackLogsDashboard />
                <HistoryTable history={history} />
              </div>
            )}

            {currentTab === "analytics" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Analytics</h1>
                  <p className="text-muted-foreground">Threat statistics and trends</p>
                </div>
                <AttackLogsDashboard showAnalyticsOnly={true} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
