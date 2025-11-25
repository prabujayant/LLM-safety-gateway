import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, AlertCircle, Code2 } from 'lucide-react';

interface DocumentThreat {
  threat_indicators: string[];
  threat_score: number;
  jailbreak_attempts: string[];
  encoded_payloads: string[];
  macro_indicators: string[];
  urls_found: string[];
}

interface DocumentAnalysisData {
  success: boolean;
  filename: string;
  size: number;
  type: string;
  extractedText: string;
  threatAnalysis?: {
    scores?: {
      action: string;
      total_score: number;
      regex_score: number;
      entropy_score: number;
      anomaly_score: number;
    };
    sanitized?: string;
  };
  documentThreats?: DocumentThreat;
}

interface DocumentAnalysisPanelProps {
  data: DocumentAnalysisData | null;
}

export function DocumentAnalysisPanel({ data }: DocumentAnalysisPanelProps) {
  if (!data || !data.success) {
    return null;
  }

  const threatData = data.documentThreats;
  const threatAnalysis = data.threatAnalysis;
  const scores = threatAnalysis?.scores || {
    action: 'unknown',
    total_score: 0,
    regex_score: 0,
    entropy_score: 0,
    anomaly_score: 0,
  };

  const getThreatColor = (score: number) => {
    if (score >= 75) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getThreatBgColor = (score: number) => {
    if (score >= 75) return 'bg-red-50 border-red-200';
    if (score >= 50) return 'bg-orange-50 border-orange-200';
    if (score >= 25) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getActionBadgeVariant = (action: string) => {
    switch ((action || 'pass').toLowerCase()) {
      case 'block':
        return 'destructive';
      case 'sanitize':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Threat Score Card */}
      <Card className={`border-2 ${getThreatBgColor(scores.total_score || 0)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <div
                className={`text-2xl font-bold ${getThreatColor(
                  scores.total_score || 0
                )}`}
              >
                {scores.total_score || 0}
              </div>
              <div className="text-sm text-gray-600">/100</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">File:</span>
            <span className="text-sm text-gray-600">{data.filename}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Size:</span>
            <span className="text-sm text-gray-600">
              {(data.size / 1024).toFixed(2)} KB
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Action:</span>
            <Badge variant={getActionBadgeVariant(scores.action || 'pass')}>
              {(scores.action || 'pass').toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Extracted Text Preview */}
      {data.extractedText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted Text Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto text-sm text-gray-700 font-mono">
              {data.extractedText.substring(0, 500)}
              {data.extractedText.length > 500 && '...'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threat Indicators */}
      {threatData && threatData.threat_indicators.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              Suspicious Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {threatData.threat_indicators.map((indicator, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-600 font-bold">•</span>
                  <span className="text-gray-700">{indicator}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jailbreak Attempts */}
      {threatData && threatData.jailbreak_attempts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Jailbreak Attempts Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {threatData.jailbreak_attempts.map((attempt, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  <code className="bg-red-100 px-2 py-1 rounded text-xs">
                    {attempt}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encoded Payloads */}
      {threatData && threatData.encoded_payloads.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="w-4 h-4 text-yellow-600" />
              Encoded Payloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {threatData.encoded_payloads.map((payload, idx) => (
                <div key={idx} className="text-xs text-gray-700 break-all">
                  <span className="font-semibold text-yellow-700">
                    {payload.split(':')[0]}:
                  </span>{' '}
                  {payload.split(':').slice(1).join(':')}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Macro Indicators */}
      {threatData && threatData.macro_indicators.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-600" />
              Macro/Script Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {threatData.macro_indicators.map((macro, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  <code className="bg-purple-100 px-2 py-1 rounded text-xs">
                    {macro}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* URLs Found */}
      {threatData && threatData.urls_found.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">URLs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {threatData.urls_found.map((url, idx) => (
                <div key={idx} className="text-sm text-blue-700 break-all">
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                    {url}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threat Scoring Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Threat Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Regex Score:</span>
            <span className="font-mono text-sm">{scores.regex_score || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Entropy Score:</span>
            <span className="font-mono text-sm">{scores.entropy_score || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Anomaly Score:</span>
            <span className="font-mono text-sm">{scores.anomaly_score || 0}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center font-bold">
            <span className="text-sm">Total Threat Score:</span>
            <span className="font-mono text-sm">{scores.total_score || 0}/100</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
