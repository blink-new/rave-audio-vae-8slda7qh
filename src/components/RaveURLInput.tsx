import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Music,
  Youtube,
  Music2,
  Globe,
  Trash2,
  Play,
  Clock,
  Shuffle,
  Zap,
  Link,
  Copy,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'
import type { Song } from '@/hooks/useRaveMasher'

interface RaveURLInputProps {
  songs: Song[]
  onAddSong: (url: string) => Promise<void>
  onRemoveSong: (id: string) => void
  onCreateMashup: () => Promise<void>
  onClearAll: () => void
  isProcessing: boolean
  canCreateMashup: boolean
}

const RaveURLInput: React.FC<RaveURLInputProps> = ({
  songs,
  onAddSong,
  onRemoveSong,
  onCreateMashup,
  onClearAll,
  isProcessing,
  canCreateMashup
}) => {
  const [urlInput, setUrlInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // URL validation patterns
  const isValidYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/(watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})(\S+)?$/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(\S+)?$/
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  const isValidSpotifyUrl = (url: string): boolean => {
    const pattern = /^https:\/\/open\.spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]{22}(\?.*)?$/
    return pattern.test(url)
  }

  const validateUrl = (url: string): { valid: boolean; type: 'youtube' | 'spotify' | 'unknown' } => {
    if (isValidYouTubeUrl(url)) return { valid: true, type: 'youtube' }
    if (isValidSpotifyUrl(url)) return { valid: true, type: 'spotify' }
    return { valid: false, type: 'unknown' }
  }

  const handleAddSong = useCallback(async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL')
      return
    }

    const validation = validateUrl(urlInput.trim())
    if (!validation.valid) {
      toast.error('Please enter a valid YouTube or Spotify URL')
      return
    }

    // Check for duplicates
    if (songs.some(song => song.originalUrl === urlInput.trim())) {
      toast.error('This song is already added')
      return
    }

    setIsAdding(true)
    try {
      await onAddSong(urlInput.trim())
      setUrlInput('')
      toast.success('Song added successfully!')
    } catch (error) {
      toast.error('Failed to add song. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }, [urlInput, songs, onAddSong])

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-4 h-4" />
      case 'spotify':
        return <Music2 className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const getSourceColor = (type: string) => {
    switch (type) {
      case 'youtube':
        return 'border-red-500/30 text-red-400'
      case 'spotify':
        return 'border-green-500/30 text-green-400'
      default:
        return 'border-gray-500/30 text-gray-400'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('URL copied to clipboard')
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Link className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Add Songs to Mix</h3>
                <p className="text-sm text-gray-400">
                  Paste YouTube or Spotify URLs to build your mashup
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://open.spotify.com/track/..."
                  className="bg-black/30 border-white/20 text-white placeholder:text-gray-500 h-12"
                  onKeyPress={(e) => e.key === 'Enter' && !isAdding && handleAddSong()}
                  disabled={isAdding || isProcessing}
                />
              </div>
              <Button
                onClick={handleAddSong}
                disabled={isAdding || isProcessing || !urlInput.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-12 px-6"
              >
                {isAdding ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Music className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="ml-2 hidden sm:inline">Add Song</span>
              </Button>
            </div>

            {/* Supported Platforms */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-red-500/30 text-red-400">
                <Youtube className="w-3 h-3 mr-1" />
                YouTube
              </Badge>
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <Music2 className="w-3 h-3 mr-1" />
                Spotify
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Song List */}
      <AnimatePresence>
        {songs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white flex items-center">
                <Music className="w-5 h-5 mr-2 text-purple-400" />
                Songs Ready to Mix ({songs.length})
              </h4>
              {songs.length > 1 && (
                <Button
                  onClick={onClearAll}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid gap-3">
              {songs.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-black/30 border-white/10 backdrop-blur-sm hover:bg-black/40 transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${
                              song.type === 'youtube' 
                                ? 'from-red-600 to-red-700' 
                                : 'from-green-600 to-green-700'
                            }`}>
                              {getSourceIcon(song.type)}
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">{index + 1}</span>
                            </div>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-white font-medium truncate">
                                {song.title}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getSourceColor(song.type)}`}
                              >
                                {song.type.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-3 text-sm text-gray-400">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDuration(song.duration)}
                              </span>
                              {song.artist && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{song.artist}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const audio = new Audio(song.audioUrl)
                              audio.play().catch(() => toast.error('Failed to play preview'))
                            }}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            disabled={isProcessing}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(song.originalUrl)}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveSong(song.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            disabled={isProcessing}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Create Mashup Button */}
            <AnimatePresence>
              {canCreateMashup && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="pt-4"
                >
                  <Card className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30 backdrop-blur-xl">
                    <CardContent className="p-6 text-center">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={onCreateMashup}
                          disabled={isProcessing}
                          className="w-full h-14 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 hover:from-orange-700 hover:via-red-700 hover:to-pink-700 text-lg font-semibold disabled:opacity-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                              <Shuffle className="w-5 h-5" />
                            </div>
                            <span>Create Epic Mashup</span>
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                              <Zap className="w-5 h-5" />
                            </div>
                          </div>
                        </Button>
                      </motion.div>
                      <p className="text-orange-200/80 text-sm mt-3">
                        Our AI will analyze tempo, key, and structure to create the perfect mix
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RaveURLInput