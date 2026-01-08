import { useState } from "react"
import { FileSpreadsheet, Sparkles, Download, ArrowRight } from "lucide-react"

// Types
interface APIConfig {
  headers?: Record<string, string>
  timeout?: number
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

interface HeaderStyle {
  bg_color?: string
  font_color?: string
  bold?: boolean
  font_size?: number
  alignment?: string
}

interface ColumnConfig {
  name: string
  width?: number
  style?: {
    alignment?: string
  }
}

interface ExcelResponse {
  success: boolean
  filename: string
  columns: string[]
  rows: any[][]
  header_style?: HeaderStyle
  column_configs?: ColumnConfig[]
  total_rows: number
}

// Axios-like wrapper usando fetch nativo
class APIClient {
  baseURL: string
  private config: {
    headers: Record<string, string>
    timeout: number
  }

  constructor(baseURL: string, config: APIConfig = {}) {
    this.baseURL = baseURL
    this.config = {
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      timeout: config.timeout || 30000,
    }
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: `HTTP Error: ${response.status}` }))
        throw new Error(error.detail || `HTTP Error: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === "AbortError") {
        throw new Error("Request timeout")
      }
      throw error
    }
  }

  post<T = any>(endpoint: string, data?: any, config: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

// Configuración del cliente API
const api = new APIClient(import.meta.env.VITE_SERVER_URL)

// Servicios de Excel API
const excelAPI = {
  generateFromPrompt: async (prompt: string): Promise<ExcelResponse> => {
    return await api.post<ExcelResponse>("/excel/from-prompt", { prompt })
  },

  downloadFile: (filename: string): string => {
    return `${api.baseURL}/excel/download/${filename}`
  },
}

export default function SheetGenPage() {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [excelData, setExcelData] = useState<ExcelResponse | null>(null)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setIsSuccess(false)
    setError("")

    try {
      const data = await excelAPI.generateFromPrompt(prompt)
      setExcelData(data)
      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message || "Error generating spreadsheet")
      console.error("Generation error:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!excelData) return
    const downloadUrl = excelAPI.downloadFile(excelData.filename)
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = excelData.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReset = () => {
    setIsSuccess(false)
    setPrompt("")
    setExcelData(null)
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f111a] text-[#e5e5e5]">
      {/* Header */}
      <header className="border-b border-[#2a2c3c] backdrop-blur-md sticky top-0 z-10 bg-[#0f111a]/90 shadow-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#4f46e5] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-medium text-white">SheetGen</h1>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center p-6 pt-12">
        <div className="w-full max-w-3xl">
          {!isSuccess ? (
            <div className="space-y-8">
              {/* Hero */}
              <div className="text-center space-y-4 mb-10">
                <h2 className="text-5xl font-normal text-white tracking-tight leading-tight">
                  Generate Excel files
                  <br />
                  with AI
                </h2>
                <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
                  Describe what you need and let AI create the perfect spreadsheet
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-2xl bg-red-700/10 border border-red-600/30 text-red-400 shadow-sm">
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1 opacity-90">{error}</p>
                </div>
              )}

              {/* Prompt textarea */}
              <div className="space-y-4">
                <div className="relative group">
                  <textarea
                    placeholder="Create a sales tracker with columns for date, product, quantity, and price..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full min-h-[140px] resize-none text-base border border-[#2a2c3c] focus:border-[#4f46e5] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/50 rounded-lg px-4 py-3.5 bg-[#1a1c2c] text-white placeholder:text-gray-500 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isGenerating}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{prompt.length} characters</p>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="inline-flex items-center justify-center rounded-full font-medium px-6 h-10 bg-[#4f46e5] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6">
                {[
                  { icon: "⚡", title: "Fast", desc: "Instant generation" },
                  { icon: "🎯", title: "Accurate", desc: "AI-powered" },
                  { icon: "📊", title: "Flexible", desc: "Any format" },
                ].map((feature, i) => (
                  <div key={i} className="text-center p-4 rounded-xl bg-[#1a1c2c] border border-[#2a2c3c] shadow-sm">
                    <div className="text-2xl mb-2">{feature.icon}</div>
                    <h3 className="font-medium text-white text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-gray-400">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Success */
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#2a2c3c] bg-[#1a1c2c] p-6 shadow-sm">
                <div className="text-center space-y-3 mb-6">
                  <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-green-700/20 mb-2">
                    <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-normal text-white">File ready</h3>
                  <p className="text-gray-400">Your spreadsheet has been generated</p>
                </div>

                {excelData && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Preview</h4>
                      <span className="text-xs text-gray-400">
                        {excelData.total_rows} rows • {excelData.columns.length} columns
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-[#2a2c3c] shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr
                            style={{
                              backgroundColor: excelData.header_style?.bg_color
                                ? `#${excelData.header_style.bg_color}`
                                : "#2a2c3c",
                              color: excelData.header_style?.font_color
                                ? `#${excelData.header_style.font_color}`
                                : "#ffffff",
                            }}
                          >
                            {excelData.columns.map((column, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-3 text-left font-medium text-sm"
                                style={{
                                  fontWeight: excelData.header_style?.bold ? "600" : "500",
                                  textAlign: (excelData.header_style?.alignment as any) || "left",
                                }}
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-[#1a1c2c]">
                          {excelData.rows.slice(0, 5).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-t border-[#2a2c3c] hover:bg-[#2a2c3c]/50 transition-colors">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-4 py-3 text-white">
                                  {typeof cell === "number" && cell % 1 !== 0 ? cell.toFixed(2) : cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {excelData.total_rows > 5 && (
                      <p className="text-xs text-gray-400 text-center">
                        Showing 5 of {excelData.total_rows} rows
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl bg-[#2a2c3c]/50 border border-[#2a2c3c] flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-green-700/20 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {excelData?.filename || "spreadsheet.xlsx"}
                    </p>
                    <p className="text-sm text-gray-400">Excel Workbook</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={handleDownload}
                    className="flex-1 inline-flex items-center justify-center rounded-full font-medium h-10 bg-[#4f46e5] text-white hover:opacity-90 transition-all shadow-md"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 inline-flex items-center justify-center rounded-full font-medium h-10 border border-[#2a2c3c] bg-transparent text-white hover:bg-[#2a2c3c]/50 transition-colors"
                  >
                    Create another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2c3c] py-4 px-6 mt-auto">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-400">
          SheetGen uses AI to generate spreadsheets
        </div>
      </footer>
    </div>
  )
}
