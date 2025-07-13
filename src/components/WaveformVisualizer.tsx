import { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface AudioAnalysisData {
  frequencyData: Uint8Array
  timeData: Uint8Array
  sampleRate: number
  duration: number
  peaks: number[]
  rms: number
  centroid: number
}

interface WaveformVisualizerProps {
  width: number
  height: number
  analysisData?: AudioAnalysisData
  isPlaying: boolean
  staticWaveform?: number[]
  className?: string
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  width,
  height,
  analysisData,
  isPlaying,
  staticWaveform,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)

  const drawFrequencyBars = useCallback((
    ctx: CanvasRenderingContext2D,
    frequencyData: Uint8Array,
    width: number,
    height: number
  ) => {
    const barWidth = width / frequencyData.length
    const centerY = height / 2

    // Clear canvas
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(0, 0, width, height)

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#8b5cf6')
    gradient.addColorStop(0.3, '#06b6d4')
    gradient.addColorStop(0.6, '#10b981')
    gradient.addColorStop(1, '#f59e0b')

    // Draw frequency bars
    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * height * 0.8
      const x = i * barWidth

      // Main bar
      ctx.fillStyle = gradient
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight)

      // Glow effect
      if (frequencyData[i] > 50) {
        ctx.shadowColor = '#8b5cf6'
        ctx.shadowBlur = 10
        ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight)
        ctx.shadowBlur = 0
      }
    }
  }, [])

  const drawWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    timeData: Uint8Array,
    width: number,
    height: number
  ) => {
    const centerY = height / 2
    const sliceWidth = width / timeData.length

    // Clear canvas
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(0, 0, width, height)

    // Draw waveform
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128.0
      const y = centerY + (v * centerY * 0.8)
      const x = i * sliceWidth

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Add glow effect
    ctx.shadowColor = '#6366f1'
    ctx.shadowBlur = 15
    ctx.stroke()
    ctx.shadowBlur = 0
  }, [])

  const drawStaticWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number
  ) => {
    const centerY = height / 2

    // Clear canvas
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(0, 0, width, height)

    // Draw waveform
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * width
      const y = centerY + (data[i] * centerY * 0.8)
      
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
  }, [])

  const drawSpectralCentroid = useCallback((
    ctx: CanvasRenderingContext2D,
    centroid: number,
    width: number,
    height: number
  ) => {
    if (centroid === 0) return

    const x = (centroid / 1024) * width // Normalize to canvas width
    
    // Draw centroid line
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.setLineDash([])

    // Add label
    ctx.fillStyle = '#f59e0b'
    ctx.font = '12px monospace'
    ctx.fillText('Spectral Centroid', x + 5, 20)
  }, [])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (analysisData && isPlaying) {
      // Draw real-time frequency analysis
      drawFrequencyBars(ctx, analysisData.frequencyData, width, height)
      
      // Overlay spectral centroid
      drawSpectralCentroid(ctx, analysisData.centroid, width, height)
      
      // Add RMS meter
      const rmsHeight = analysisData.rms * height * 0.3
      ctx.fillStyle = 'rgba(34, 197, 94, 0.7)'
      ctx.fillRect(width - 20, height - rmsHeight, 15, rmsHeight)
      
      // Add peak indicators
      analysisData.peaks.forEach((peak, index) => {
        const x = (peak / analysisData.frequencyData.length) * width
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(x - 1, 0, 2, 10)
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    } else if (staticWaveform && staticWaveform.length > 0) {
      // Draw static waveform when not playing
      drawStaticWaveform(ctx, staticWaveform, width, height)
    }
  }, [analysisData, isPlaying, staticWaveform, width, height, drawFrequencyBars, drawWaveform, drawStaticWaveform, drawSpectralCentroid])

  useEffect(() => {
    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate])

  useEffect(() => {
    // Set canvas resolution
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [width, height])

  return (
    <motion.div
      className={className}
      animate={{
        scale: isPlaying ? [1, 1.02, 1] : 1,
      }}
      transition={{
        duration: 2,
        repeat: isPlaying ? Infinity : 0,
        ease: "easeInOut"
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg border border-white/10 bg-black/20"
        style={{ width, height }}
      />
      
      {/* Analysis overlay */}
      {analysisData && (
        <div className="absolute top-2 right-2 space-y-1 text-xs text-gray-400">
          <div className="bg-black/50 px-2 py-1 rounded">
            RMS: {analysisData.rms.toFixed(3)}
          </div>
          <div className="bg-black/50 px-2 py-1 rounded">
            Centroid: {analysisData.centroid.toFixed(0)} Hz
          </div>
          <div className="bg-black/50 px-2 py-1 rounded">
            Peaks: {analysisData.peaks.length}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default WaveformVisualizer