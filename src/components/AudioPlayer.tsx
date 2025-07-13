import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'

interface AudioPlayerProps {
  audioUrl: string | null
  onPlayStateChange: (isPlaying: boolean) => void
  isPlaying: boolean
  waveformData?: number[]
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  onPlayStateChange,
  isPlaying,
  waveformData = []
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => onPlayStateChange(false)

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl, onPlayStateChange])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch(console.error)
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl) return
    onPlayStateChange(!isPlaying)
  }, [isPlaying, onPlayStateChange, audioUrl])

  const handleSeek = useCallback((value: number[]) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const newTime = (value[0] / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0] / 100)
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const skipTime = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }, [currentTime, duration])

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Card className="bg-black/20 border-white/10 backdrop-blur-sm">
      <CardContent className="p-4">
        <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />
        
        {/* Mini Waveform Visualization */}
        {waveformData.length > 0 && (
          <div className="mb-4 h-16 relative overflow-hidden rounded-lg bg-black/20">
            <div className="flex items-center h-full px-2">
              {waveformData.slice(0, 100).map((value, index) => (
                <motion.div
                  key={index}
                  className="flex-1 mx-px rounded-sm"
                  style={{
                    background: index / 100 < progress / 100 
                      ? 'linear-gradient(to top, #8b5cf6, #06b6d4)'
                      : 'rgba(255, 255, 255, 0.2)',
                    height: `${Math.max(2, value * 60)}px`,
                  }}
                  animate={{
                    opacity: isPlaying && index / 100 < progress / 100 ? [0.5, 1, 0.5] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat: isPlaying ? Infinity : 0,
                    delay: index * 0.01,
                  }}
                />
              ))}
            </div>
            
            {/* Progress overlay */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 pointer-events-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600"
            disabled={!audioUrl || isLoading}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipTime(-10)}
              disabled={!audioUrl || isLoading}
              className="text-gray-400 hover:text-white"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handlePlayPause}
              disabled={!audioUrl || isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipTime(10)}
              disabled={!audioUrl || isLoading}
              className="text-gray-400 hover:text-white"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-gray-400 hover:text-white"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <div className="w-20">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AudioPlayer