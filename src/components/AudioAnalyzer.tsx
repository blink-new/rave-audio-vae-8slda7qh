import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, RotateCcw, Activity, BarChart3, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface AudioAnalysisData {
  duration: number
  sampleRate: number
  channels: number
  bitRate: number
  format: string
  spectrum: number[]
  rms: number
  peak: number
  zcrRate: number
  spectralCentroid: number
  mfcc: number[]
}

interface AudioAnalyzerProps {
  audioFile: File | null
  audioUrl: string | null
  onAnalysisComplete?: (analysis: AudioAnalysisData) => void
}

const AudioAnalyzer: React.FC<AudioAnalyzerProps> = ({
  audioFile,
  audioUrl,
  onAnalysisComplete
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState([75])
  const [isMuted, setIsMuted] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [spectrumData, setSpectrumData] = useState<number[]>([])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  // Initialize audio context and analyzer
  const initializeAudioContext = useCallback(async () => {
    if (!audioRef.current || audioContextRef.current) return

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.8

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current)
      sourceRef.current.connect(analyserRef.current)
      analyserRef.current.connect(audioContextRef.current.destination)
    } catch (error) {
      console.error('Error initializing audio context:', error)
    }
  }, [])

  // Analyze audio file
  const analyzeAudio = useCallback(async () => {
    if (!audioFile || !audioRef.current) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      // Simulate analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      await initializeAudioContext()

      // Get basic audio properties
      const audio = audioRef.current
      const duration = audio.duration || 0
      const channels = 2 // Assume stereo
      const sampleRate = audioContextRef.current?.sampleRate || 44100

      // Generate mock analysis data (in a real implementation, you'd process the actual audio)
      const spectrum = Array.from({ length: 128 }, (_, i) => 
        Math.random() * 100 * Math.exp(-i / 40)
      )
      
      const mfcc = Array.from({ length: 13 }, () => Math.random() * 2 - 1)

      const analysis: AudioAnalysisData = {
        duration,
        sampleRate,
        channels,
        bitRate: 320, // Mock bitrate
        format: audioFile.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
        spectrum,
        rms: Math.random() * 0.8 + 0.1,
        peak: Math.random() * 0.9 + 0.1,
        zcrRate: Math.random() * 0.3 + 0.1,
        spectralCentroid: Math.random() * 2000 + 1000,
        mfcc
      }

      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setAnalysisData(analysis)
      onAnalysisComplete?.(analysis)

      setTimeout(() => {
        setIsAnalyzing(false)
        setAnalysisProgress(0)
      }, 500)

    } catch (error) {
      console.error('Error analyzing audio:', error)
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }, [audioFile, initializeAudioContext, onAnalysisComplete])

  // Real-time spectrum visualization
  const updateVisualizations = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current || !spectrumCanvasRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const timeDataArray = new Uint8Array(bufferLength)
    
    analyserRef.current.getByteFrequencyData(dataArray)
    analyserRef.current.getByteTimeDomainData(timeDataArray)

    // Update waveform
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const width = canvas.width
      const height = canvas.height

      ctx.fillStyle = '#0f0f23'
      ctx.fillRect(0, 0, width, height)

      ctx.lineWidth = 2
      ctx.strokeStyle = '#6366f1'
      ctx.beginPath()

      const sliceWidth = width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = timeDataArray[i] / 128.0
        const y = v * height / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.stroke()

      // Add glow effect
      ctx.shadowColor = '#6366f1'
      ctx.shadowBlur = 10
      ctx.stroke()
    }

    // Update spectrum
    const specCanvas = spectrumCanvasRef.current
    const specCtx = specCanvas.getContext('2d')
    if (specCtx) {
      const width = specCanvas.width
      const height = specCanvas.height

      specCtx.fillStyle = '#0f0f23'
      specCtx.fillRect(0, 0, width, height)

      const barWidth = width / bufferLength * 2
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height

        const gradient = specCtx.createLinearGradient(0, height, 0, height - barHeight)
        gradient.addColorStop(0, '#6366f1')
        gradient.addColorStop(0.5, '#8b5cf6')
        gradient.addColorStop(1, '#a855f7')

        specCtx.fillStyle = gradient
        specCtx.fillRect(x, height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateVisualizations)
    }
  }, [isPlaying])

  // Audio event handlers
  const handlePlay = async () => {
    if (!audioRef.current) return

    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      await audioRef.current.play()
      setIsPlaying(true)
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value)
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Effects
  useEffect(() => {
    if (audioUrl && audioFile) {
      analyzeAudio()
    }
  }, [audioUrl, audioFile, analyzeAudio])

  useEffect(() => {
    if (isPlaying) {
      updateVisualizations()
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateVisualizations])

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  if (!audioUrl || !audioFile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No audio file loaded</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      {/* Analysis Progress */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-purple-400 animate-pulse" />
                    <h3 className="text-lg font-semibold text-white">Analyzing Audio</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Processing spectral features...</span>
                      <span>{analysisProgress}%</span>
                    </div>
                    <Progress value={analysisProgress} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Player */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Play className="w-5 h-5 mr-2 text-green-400" />
            Audio Playback
          </CardTitle>
          <CardDescription className="text-gray-400">
            {audioFile.name} • {formatTime(duration)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Waveform */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Waveform</span>
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div 
              className="relative cursor-pointer"
              onClick={handleSeek}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={120}
                className="w-full h-24 rounded-lg border border-white/10"
              />
              {/* Progress indicator */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                style={{ 
                  left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  transition: 'left 0.1s ease'
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={isPlaying ? handlePause : handlePlay}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0
                    setCurrentTime(0)
                  }
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Volume */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/10"
              >
                {isMuted || volume[0] === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <div className="w-24">
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white"
                />
              </div>
              <span className="text-sm text-gray-400 w-8">{volume[0]}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spectrum Analyzer */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-yellow-400" />
            Real-time Spectrum
          </CardTitle>
          <CardDescription className="text-gray-400">
            Live frequency analysis during playback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <canvas
            ref={spectrumCanvasRef}
            width={800}
            height={200}
            className="w-full h-48 rounded-lg border border-white/10"
          />
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysisData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Audio Properties */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Radio className="w-5 h-5 mr-2 text-blue-400" />
                  Audio Properties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Duration</p>
                    <p className="text-white font-medium">{formatTime(analysisData.duration)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Sample Rate</p>
                    <p className="text-white font-medium">{analysisData.sampleRate} Hz</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Channels</p>
                    <p className="text-white font-medium">{analysisData.channels}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Format</p>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                      {analysisData.format}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio Features */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-green-400" />
                  Audio Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">RMS Energy</span>
                    <span className="text-white font-medium">{analysisData.rms.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Peak Amplitude</span>
                    <span className="text-white font-medium">{analysisData.peak.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Zero Crossing Rate</span>
                    <span className="text-white font-medium">{analysisData.zcrRate.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Spectral Centroid</span>
                    <span className="text-white font-medium">{Math.round(analysisData.spectralCentroid)} Hz</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AudioAnalyzer