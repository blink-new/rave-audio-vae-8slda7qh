import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Download, 
  Settings, 
  Radio, 
  Sliders,
  Volume2,
  Zap,
  Brain,
  Activity,
  Disc,
  GitBranch
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast, Toaster } from 'react-hot-toast'
import AudioMashup from '@/components/AudioMashup'
import AudioAnalyzer from '@/components/AudioAnalyzer'

interface AudioParams {
  crossfadeTime: number
  tempo: number
  volume1: number
  volume2: number
  bassBoost: number
  trebleBoost: number
}

interface ProcessingStatus {
  loading: boolean
  analyzing: boolean
  mixing: boolean
  progress: number
}

function App() {
  const [audioParams, setAudioParams] = useState<AudioParams>({
    crossfadeTime: 4.0,
    tempo: 128,
    volume1: 0.8,
    volume2: 0.8,
    bassBoost: 0.2,
    trebleBoost: 0.1
  })
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    loading: false,
    analyzing: false,
    mixing: false,
    progress: 0
  })
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)
  const [currentAudioFile, setCurrentAudioFile] = useState<File | null>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])
  
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const generateWaveform = () => {
      const data = Array.from({ length: 256 }, (_, i) => 
        Math.sin(i * 0.1) * Math.random() * 0.8 + Math.random() * 0.2
      )
      setWaveformData(data)
    }
    generateWaveform()
    
    const interval = setInterval(generateWaveform, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerY = height / 2

    // Clear canvas
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(0, 0, width, height)

    // Draw waveform
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < waveformData.length; i++) {
      const x = (i / waveformData.length) * width
      const y = centerY + (waveformData[i] * centerY * 0.8)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.stroke()

    // Add glow effect
    ctx.shadowColor = '#6366f1'
    ctx.shadowBlur = 10
    ctx.stroke()
  }, [waveformData])

  const handleFileUpload = useCallback((file: File, url: string) => {
    setCurrentAudio(url)
    setCurrentAudioFile(file)
    toast.success(`Audio file "${file.name}" loaded successfully`)
    
    // Simulate loading process
    setProcessingStatus(prev => ({ ...prev, loading: true, progress: 0 }))
    const interval = setInterval(() => {
      setProcessingStatus(prev => {
        const newProgress = prev.progress + 10
        if (newProgress >= 100) {
          clearInterval(interval)
          return { ...prev, loading: false, progress: 100 }
        }
        return { ...prev, progress: newProgress }
      })
    }, 200)
  }, [])

  const updateParam = useCallback((param: keyof AudioParams, value: number) => {
    setAudioParams(prev => ({ ...prev, [param]: value }))
  }, [])

  const handleAnalysisComplete = useCallback((analysis: any) => {
    console.log('Audio analysis complete:', analysis)
    toast.success('Audio analysis completed!')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <Disc className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">RAVE Audio Mixer</h1>
                  <p className="text-sm text-gray-400">Real-time Audio Mashup & Effects Engine</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Activity className="w-3 h-3 mr-1" />
                Mixing Engine Active
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio Mashup Section - Now the main interface */}
            <AudioMashup onFileUpload={handleFileUpload} />

            {/* Audio Analysis Section - Simplified */}
            {currentAudioFile && (
              <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center">
                        <Radio className="w-5 h-5 mr-2 text-orange-400" />
                        Audio Analysis & Playback
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Real-time audio analysis and beat detection for perfect mixing
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {processingStatus.loading && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                          Loading...
                        </Badge>
                      )}
                      {processingStatus.analyzing && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                          Analyzing...
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <AudioAnalyzer
                    audioFile={currentAudioFile}
                    audioUrl={currentAudio}
                    onAnalysisComplete={handleAnalysisComplete}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-green-400" />
                  Mixing Stats
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Real-time processing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Sample Rate</span>
                    <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                      44.1 kHz
                    </Badge>
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Bit Depth</span>
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                      16-bit
                    </Badge>
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Processing</span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                      Real-time
                    </Badge>
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Output Format</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-400">
                      WAV/MP3
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Smart Crossfading</p>
                      <p className="text-gray-400 text-xs">Seamless track transitions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Beat Detection</p>
                      <p className="text-gray-400 text-xs">Automatic tempo matching</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Volume2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Audio Effects</p>
                      <p className="text-gray-400 text-xs">EQ, reverb, compression</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Disc className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Time Stretching</p>
                      <p className="text-gray-400 text-xs">Pitch-preserving tempo sync</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-cyan-400" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-300 space-y-2">
                  <p className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">1.</span>
                    <span>Upload two audio tracks you want to mix</span>
                  </p>
                  <p className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">2.</span>
                    <span>AI analyzes beats, tempo, and structure</span>
                  </p>
                  <p className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">3.</span>
                    <span>Automatic tempo matching and alignment</span>
                  </p>
                  <p className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">4.</span>
                    <span>Smart crossfading and audio effects</span>
                  </p>
                  <p className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">5.</span>
                    <span>Download your professional mashup</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </div>
  )
}

export default App