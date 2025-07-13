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
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast, Toaster } from 'react-hot-toast'
import AudioUpload from '@/components/AudioUpload'
import AudioAnalyzer from '@/components/AudioAnalyzer'
import NeuralSynthesis from '@/components/NeuralSynthesis'

interface AudioParams {
  latentDim: number
  temperature: number
  interpolation: number
  noiseLevel: number
  compressionRatio: number
}

interface ProcessingStatus {
  encoding: boolean
  decoding: boolean
  generating: boolean
  progress: number
}

function App() {
  const [audioParams, setAudioParams] = useState<AudioParams>({
    latentDim: 128,
    temperature: 0.8,
    interpolation: 0.5,
    noiseLevel: 0.1,
    compressionRatio: 32
  })
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    encoding: false,
    decoding: false,
    generating: false,
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
    
    // Simulate encoding process
    setProcessingStatus(prev => ({ ...prev, encoding: true, progress: 0 }))
    const interval = setInterval(() => {
      setProcessingStatus(prev => {
        const newProgress = prev.progress + 10
        if (newProgress >= 100) {
          clearInterval(interval)
          return { ...prev, encoding: false, progress: 100 }
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
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">RAVE Audio VAE</h1>
                  <p className="text-sm text-gray-400">Real-time Audio Variational Autoencoder</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                <Activity className="w-3 h-3 mr-1" />
                Neural Engine Active
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
            {/* Audio Upload Section */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-purple-400" />
                  Audio Input
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Upload your audio files for neural processing and synthesis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudioUpload onFileUpload={handleFileUpload} />
              </CardContent>
            </Card>

            {/* Waveform Visualization */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <Radio className="w-5 h-5 mr-2 text-purple-400" />
                      Audio Analysis & Playback
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Real-time audio analysis and neural processing
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {processingStatus.encoding && (
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                        Encoding...
                      </Badge>
                    )}
                    {processingStatus.generating && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                        Generating...
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

            {/* Neural Synthesis Section */}
            <NeuralSynthesis 
              audioFile={currentAudioFile}
              audioParams={audioParams}
              onParameterChange={updateParam}
            />
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Model Parameters */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Sliders className="w-5 h-5 mr-2 text-green-400" />
                  Model Parameters
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Control the neural network behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-gray-300">Latent Dimension</label>
                    <span className="text-purple-400">{audioParams.latentDim}</span>
                  </div>
                  <Slider
                    value={[audioParams.latentDim]}
                    onValueChange={([value]) => updateParam('latentDim', value)}
                    max={512}
                    min={64}
                    step={16}
                    className="[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-gray-300">Temperature</label>
                    <span className="text-blue-400">{audioParams.temperature.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[audioParams.temperature]}
                    onValueChange={([value]) => updateParam('temperature', value)}
                    max={2.0}
                    min={0.1}
                    step={0.1}
                    className="[&_[role=slider]]:bg-blue-600 [&_[role=slider]]:border-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-gray-300">Noise Level</label>
                    <span className="text-yellow-400">{audioParams.noiseLevel.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[audioParams.noiseLevel]}
                    onValueChange={([value]) => updateParam('noiseLevel', value)}
                    max={1.0}
                    min={0.0}
                    step={0.05}
                    className="[&_[role=slider]]:bg-yellow-600 [&_[role=slider]]:border-yellow-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-gray-300">Compression Ratio</label>
                    <span className="text-green-400">{audioParams.compressionRatio}x</span>
                  </div>
                  <Slider
                    value={[audioParams.compressionRatio]}
                    onValueChange={([value]) => updateParam('compressionRatio', value)}
                    max={128}
                    min={8}
                    step={8}
                    className="[&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Model Info */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Volume2 className="w-5 h-5 mr-2 text-orange-400" />
                  Model Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Sample Rate</span>
                    <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                      48 kHz
                    </Badge>
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Latent Space</span>
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                      {audioParams.latentDim}D
                    </Badge>
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Model Type</span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                      VAE
                    </Badge>
                  </div>
                  
                  <Separator className="bg-white/10" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Training Data</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-400">
                      Multi-domain
                    </Badge>
                  </div>
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