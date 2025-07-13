import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Download,
  Share2,
  RotateCcw,
  Volume2,
  VolumeX,
  Heart,
  Star,
  Disc,
  Music,
  Clock,
  Users,
  Sparkles,
  Headphones
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { toast } from 'react-hot-toast'
import type { MashupResult } from '@/hooks/useRaveMasher'

interface MashupPlayerProps {
  mashup: MashupResult
  onCreateNew: () => void
}

const MashupPlayer: React.FC<MashupPlayerProps> = ({
  mashup,
  onCreateNew
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState([75])
  const [isMuted, setIsMuted] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [showVisualizer, setShowVisualizer] = useState(true)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  // Initialize audio
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.src = mashup.audioUrl
    audio.volume = isMuted ? 0 : volume[0] / 100

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [mashup.audioUrl, volume, isMuted])

  // Audio visualizer
  useEffect(() => {
    if (!showVisualizer) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      
      // Clear canvas
      ctx.fillStyle = '#0f0f23'
      ctx.fillRect(0, 0, width, height)

      // Generate fake frequency data for visualization
      const barCount = 64
      const barWidth = width / barCount
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = isPlaying 
          ? Math.random() * height * 0.8 * (currentTime / duration || 0.5)
          : height * 0.1
        
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight)
        gradient.addColorStop(0, '#8b5cf6')
        gradient.addColorStop(0.5, '#ec4899')
        gradient.addColorStop(1, '#f97316')
        
        ctx.fillStyle = gradient
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight)
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, currentTime, duration, showVisualizer])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error('Failed to play audio'))
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = (value[0] / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value)
    const audio = audioRef.current
    if (audio) {
      audio.volume = isMuted ? 0 : value[0] / 100
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    const audio = audioRef.current
    if (audio) {
      audio.volume = !isMuted ? 0 : volume[0] / 100
    }
  }

  const downloadMashup = () => {
    const link = document.createElement('a')
    link.href = mashup.audioUrl
    link.download = `rave-mashup-${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Download started!')
  }

  const shareMashup = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my AI Mashup!',
          text: `Amazing mashup created with RAVE AI: ${mashup.songs.map(s => s.title).join(' + ')}`,
          url: window.location.href
        })
      } catch (error) {
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard!')
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-black/40 border-green-500/30 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                  className="w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl"
                >
                  <Disc className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-emerald-400" />
                    Epic Mashup Ready!
                  </h3>
                  <p className="text-emerald-300 text-sm">
                    {mashup.songs.map(song => song.title).join(' + ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="border-green-500/30 text-green-300">
                  <Music className="w-3 h-3 mr-1" />
                  {mashup.songs.length} tracks mixed
                </Badge>
                <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(duration)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Visualizer */}
          {showVisualizer && (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-32 bg-gradient-to-b from-purple-900/20 to-black/40"
                onClick={() => setShowVisualizer(!showVisualizer)}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  animate={{ scale: isPlaying ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 2, repeat: isPlaying ? Infinity : 0 }}
                  className="text-white/60 text-sm font-medium"
                >
                  {isPlaying ? '🎵 Playing...' : '🎧 Click play to start'}
                </motion.div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-6 space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <Slider
                value={[duration ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="[&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600"
              />
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={togglePlayPause}
                    className="w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                </motion.div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={toggleMute}
                    variant="ghost"
                    size="sm"
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
                      className="[&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setIsLiked(!isLiked)}
                  variant="ghost"
                  size="sm"
                  className={`${isLiked ? 'text-red-400 hover:text-red-300' : 'text-white hover:text-red-400'} hover:bg-white/10`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>

                <Button
                  onClick={shareMashup}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  onClick={downloadMashup}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Track Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mashup.songs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center space-x-3 p-3 bg-black/20 rounded-lg border border-white/10"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                    song.type === 'youtube' 
                      ? 'bg-gradient-to-r from-red-600 to-red-700' 
                      : 'bg-gradient-to-r from-green-600 to-green-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm truncate">{song.title}</p>
                    {song.artist && (
                      <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onCreateNew}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Create Another Mashup
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowVisualizer(!showVisualizer)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Headphones className="w-4 h-4 mr-2" />
                {showVisualizer ? 'Hide' : 'Show'} Visualizer
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 pt-2 border-t border-white/10">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span>AI Mixed</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>Studio Quality</span>
              </div>
              <div className="flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Professional Effects</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
    </motion.div>
  )
}

export default MashupPlayer