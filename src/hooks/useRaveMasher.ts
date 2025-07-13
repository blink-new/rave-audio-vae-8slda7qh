import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

export interface Song {
  id: string
  originalUrl: string
  title: string
  artist?: string
  duration: number
  type: 'youtube' | 'spotify'
  audioUrl: string
  thumbnail?: string
}

export interface MashupResult {
  id: string
  songs: Song[]
  audioUrl: string
  duration: number
  createdAt: Date
}

export interface RaveState {
  songs: Song[]
  isProcessing: boolean
  currentStage: string
  progress: number
  currentStep: number
  totalSteps: number
  mashupResult: MashupResult | null
  error: string | null
}

const PROCESSING_STAGES = [
  'analyzing',
  'extracting', 
  'tempo-matching',
  'beat-detection',
  'mixing',
  'effects',
  'finalizing'
]

export const useRaveMasher = () => {
  const [state, setState] = useState<RaveState>({
    songs: [],
    isProcessing: false,
    currentStage: 'analyzing',
    progress: 0,
    currentStep: 1,
    totalSteps: PROCESSING_STAGES.length,
    mashupResult: null,
    error: null
  })

  // Simulate URL processing and song extraction
  const extractSongFromUrl = async (url: string): Promise<Song> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Determine source type
    const isYoutube = /(?:youtube\.com|youtu\.be)/.test(url)
    const isSpotify = /spotify\.com/.test(url)

    // Generate mock song data
    const songTitles = [
      "Blinding Lights", "Shape of You", "Someone You Loved", "Watermelon Sugar",
      "Levitating", "good 4 u", "Stay", "Industry Baby", "Heat Waves", "As It Was",
      "About Damn Time", "Running Up That Hill", "Anti-Hero", "Unholy", "Flowers"
    ]
    
    const artists = [
      "The Weeknd", "Ed Sheeran", "Lewis Capaldi", "Harry Styles",
      "Dua Lipa", "Olivia Rodrigo", "The Kid LAROI", "Lil Nas X", "Glass Animals", "Harry Styles",
      "Lizzo", "Kate Bush", "Taylor Swift", "Sam Smith", "Miley Cyrus"
    ]

    const randomTitle = songTitles[Math.floor(Math.random() * songTitles.length)]
    const randomArtist = artists[Math.floor(Math.random() * artists.length)]
    const randomDuration = Math.floor(Math.random() * 120) + 180 // 3-5 minutes

    // Create a mock audio URL (in reality, this would be the extracted audio)
    const audioUrl = `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGEaAC2Ew9zToibvCCBxy/Df`

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      originalUrl: url,
      title: randomTitle,
      artist: randomArtist,
      duration: randomDuration,
      type: isYoutube ? 'youtube' : isSpotify ? 'spotify' : 'youtube',
      audioUrl,
      thumbnail: `https://picsum.photos/300/300?random=${Math.random()}`
    }
  }

  // Add a song from URL
  const addSong = useCallback(async (url: string) => {
    try {
      const song = await extractSongFromUrl(url)
      
      setState(prev => ({
        ...prev,
        songs: [...prev.songs, song],
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add song'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [])

  // Remove a song
  const removeSong = useCallback((songId: string) => {
    setState(prev => ({
      ...prev,
      songs: prev.songs.filter(song => song.id !== songId)
    }))
  }, [])

  // Clear all songs
  const clearAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      songs: [],
      mashupResult: null,
      error: null
    }))
  }, [])

  // Simulate the mashup creation process
  const createMashup = useCallback(async () => {
    if (state.songs.length < 2) {
      toast.error('Please add at least 2 songs to create a mashup')
      return
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      currentStep: 1,
      currentStage: PROCESSING_STAGES[0],
      error: null
    }))

    try {
      // Simulate each stage of processing
      for (let i = 0; i < PROCESSING_STAGES.length; i++) {
        const stage = PROCESSING_STAGES[i]
        const stepProgress = ((i + 1) / PROCESSING_STAGES.length) * 100

        setState(prev => ({
          ...prev,
          currentStage: stage,
          currentStep: i + 1,
          progress: 0
        }))

        // Simulate stage progress
        for (let progress = 0; progress <= 100; progress += 5) {
          await new Promise(resolve => setTimeout(resolve, 50))
          setState(prev => ({
            ...prev,
            progress: Math.min(progress, 100)
          }))
        }

        // Additional delay for some stages
        if (stage === 'mixing' || stage === 'effects') {
          await new Promise(resolve => setTimeout(resolve, 800))
        }
      }

      // Create mock mashup result
      const totalDuration = Math.max(...state.songs.map(s => s.duration)) + 30
      
      // Generate a more complex mock audio URL (in reality, this would be the actual mashup)
      const mashupAudioUrl = `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGEaAC2Ew9zToibvCCBxy/Df${Date.now()}`

      const mashupResult: MashupResult = {
        id: Date.now().toString(),
        songs: state.songs,
        audioUrl: mashupAudioUrl,
        duration: totalDuration,
        createdAt: new Date()
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        mashupResult,
        progress: 100
      }))

      toast.success('🎉 Epic mashup created successfully!')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create mashup'
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        progress: 0
      }))
      toast.error('Failed to create mashup. Please try again.')
    }
  }, [state.songs])

  // Reset state for new mashup
  const resetState = useCallback(() => {
    setState({
      songs: [],
      isProcessing: false,
      currentStage: 'analyzing',
      progress: 0,
      currentStep: 1,
      totalSteps: PROCESSING_STAGES.length,
      mashupResult: null,
      error: null
    })
  }, [])

  return {
    state,
    addSong,
    removeSong,
    clearAll,
    createMashup,
    resetState
  }
}