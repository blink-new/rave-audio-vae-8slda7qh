import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Disc,
  Activity,
  Zap,
  Brain,
  Music,
  Star,
  Sparkles,
  Radio
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Toaster } from 'react-hot-toast'
import RaveURLInput from '@/components/RaveURLInput'
import MashupPlayer from '@/components/MashupPlayer'
import RaveProgress from '@/components/RaveProgress'
import { useRaveMasher } from '@/hooks/useRaveMasher'

function App() {
  const {
    state,
    addSong,
    removeSong,
    createMashup,
    clearAll,
    resetState
  } = useRaveMasher()

  // Generate dynamic background effects
  const [bgEffects, setBgEffects] = useState<Array<{id: number, x: number, y: number, delay: number}>>([])

  useEffect(() => {
    const effects = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5
    }))
    setBgEffects(effects)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {bgEffects.map(effect => (
          <motion.div
            key={effect.id}
            className="absolute w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-20"
            style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
            animate={{
              scale: [0.5, 1.5, 0.5],
              opacity: [0.1, 0.6, 0.1],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 4,
              delay: effect.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="flex items-center space-x-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                      <Disc className="w-8 h-8 text-white" />
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                      RAVE AI Mixer
                    </h1>
                    <p className="text-gray-300 text-sm">
                      Create Epic AI-Powered Song Mashups • Powered by Neural Audio Processing
                    </p>
                  </div>
                </motion.div>
                
                <AnimatePresence>
                  {state.songs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge 
                        variant="secondary" 
                        className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1"
                      >
                        <Activity className="w-3 h-3 mr-1" />
                        {state.songs.length} Song{state.songs.length !== 1 ? 's' : ''} Ready
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="border-purple-500/30 text-purple-300 hidden sm:flex">
                  <Brain className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
                <Badge variant="outline" className="border-orange-500/30 text-orange-300 hidden sm:flex">
                  <Star className="w-3 h-3 mr-1" />
                  Pro Quality
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="space-y-8">
            {/* Hero Section - Only show when no songs */}
            <AnimatePresence>
              {state.songs.length === 0 && !state.isProcessing && !state.mashupResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-8"
                  >
                    <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl">
                      <Sparkles className="w-12 h-12 text-white" />
                    </div>
                  </motion.div>
                  
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Mix Any Songs Together
                  </h2>
                  <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
                    Paste YouTube or Spotify URLs and let our AI create incredible mashups. 
                    No musical experience required – just add songs and hit mix!
                  </p>
                  
                  <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Music className="w-4 h-4 text-red-400" />
                      <span>YouTube Support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Radio className="w-4 h-4 text-green-400" />
                      <span>Spotify Support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span>AI Processing</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* URL Input Section */}
            <RaveURLInput
              songs={state.songs}
              onAddSong={addSong}
              onRemoveSong={removeSong}
              onCreateMashup={createMashup}
              onClearAll={clearAll}
              isProcessing={state.isProcessing}
              canCreateMashup={state.songs.length >= 2}
            />

            {/* Processing Status */}
            <AnimatePresence>
              {state.isProcessing && (
                <RaveProgress
                  stage={state.currentStage}
                  progress={state.progress}
                  currentStep={state.currentStep}
                  totalSteps={state.totalSteps}
                />
              )}
            </AnimatePresence>

            {/* Mashup Player */}
            <AnimatePresence>
              {state.mashupResult && !state.isProcessing && (
                <MashupPlayer
                  mashup={state.mashupResult}
                  onCreateNew={resetState}
                />
              )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
              {state.error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 backdrop-blur-xl"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-red-300 font-semibold">Error Creating Mashup</h3>
                      <p className="text-red-200/80 text-sm">{state.error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
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