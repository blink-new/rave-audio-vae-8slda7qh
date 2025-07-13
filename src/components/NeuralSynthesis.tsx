import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Download, 
  RotateCcw, 
  Music, 
  Zap, 
  Brain, 
  Wand2,
  Shuffle,
  GitBranch,
  Volume2,
  VolumeX,
  Clock,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { toast } from 'react-hot-toast'
import useNeuralSynthesis from '@/hooks/useNeuralSynthesis'
import type { SynthesisParams } from '@/utils/neuralSynthesis'

interface NeuralSynthesisProps {
  audioFile: File | null
  audioParams: SynthesisParams
  onParameterChange: (param: keyof SynthesisParams, value: number) => void
}

const NeuralSynthesis: React.FC<NeuralSynthesisProps> = ({
  audioFile,
  audioParams,
  onParameterChange
}) => {
  const [activeTab, setActiveTab] = useState('synthesis')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState([70])
  const [isMuted, setIsMuted] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [generatedVariations, setGeneratedVariations] = useState<string[]>([])

  const {
    state,
    currentOperation,
    generateRandomAudio,
    reconstructAudio,
    encodeAudio,
    createVariations,
    interpolateAudio,
    clearAudio,
    clearError
  } = useNeuralSynthesis()

  // Audio playback control
  const playAudio = useCallback((audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ''
    }

    const audio = new Audio(audioUrl)
    audio.volume = isMuted ? 0 : volume[0] / 100
    
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => {
      toast.error('Failed to play audio')
      setIsPlaying(false)
    }
    
    setCurrentAudio(audio)
    audio.play()
      .then(() => {
        setIsPlaying(true)
        toast.success('Playing generated audio')
      })
      .catch(() => {
        toast.error('Failed to play audio')
        setIsPlaying(false)
      })
  }, [currentAudio, volume, isMuted])

  const stopAudio = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      setIsPlaying(false)
    }
  }, [currentAudio])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
    if (currentAudio) {
      currentAudio.volume = !isMuted ? 0 : volume[0] / 100
    }
  }, [currentAudio, isMuted, volume])

  // Neural synthesis operations
  const handleGenerateRandom = useCallback(async () => {
    try {
      const audioUrl = await generateRandomAudio(audioParams, 3.0)
      if (audioUrl) {
        toast.success('Random audio generated!')
        playAudio(audioUrl)
      }
    } catch (error) {
      toast.error('Failed to generate random audio')
    }
  }, [generateRandomAudio, audioParams, playAudio])

  const handleReconstruct = useCallback(async () => {
    if (!audioFile) {
      toast.error('Please upload an audio file first')
      return
    }

    try {
      const audioUrl = await reconstructAudio(audioFile, audioParams)
      if (audioUrl) {
        toast.success('Audio reconstructed!')
        playAudio(audioUrl)
      }
    } catch (error) {
      toast.error('Failed to reconstruct audio')
    }
  }, [reconstructAudio, audioFile, audioParams, playAudio])

  const handleCreateVariations = useCallback(async (strength: 'subtle' | 'dramatic') => {
    if (!state.currentLatent) {
      // First encode the current audio if available
      if (!audioFile) {
        toast.error('Please upload an audio file first')
        return
      }
      
      try {
        const latent = await encodeAudio(audioFile, audioParams)
        if (!latent) return
      } catch (error) {
        toast.error('Failed to encode audio')
        return
      }
    }

    const variationStrength = strength === 'subtle' ? 0.2 : 0.6
    try {
      const variations = await createVariations(state.currentLatent, audioParams, variationStrength, 3)
      if (variations.length > 0) {
        setGeneratedVariations(variations)
        toast.success(`${variations.length} variations created!`)
        playAudio(variations[0])
      }
    } catch (error) {
      toast.error('Failed to create variations')
    }
  }, [state.currentLatent, audioFile, encodeAudio, createVariations, audioParams, playAudio])

  const downloadAudio = useCallback((audioUrl: string, filename: string = 'neural_synthesis.wav') => {
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Audio downloaded!')
  }, [])

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      <AnimatePresence>
        {state.isProcessing && currentOperation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-purple-400" />
                        Neural Processing Active
                      </h3>
                      <p className="text-gray-400">{currentOperation.message}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Operation: {currentOperation.type}</span>
                      <span>{state.progress}%</span>
                    </div>
                    <Progress value={state.progress} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-red-400">
                    <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{state.error}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neural Synthesis Controls */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center">
                <Brain className="w-6 h-6 mr-3 text-purple-400" />
                Neural Audio Synthesis
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Generate and manipulate audio using variational autoencoder techniques
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {state.currentLatent && (
                <Badge variant="outline" className="border-green-500/30 text-green-400">
                  <Activity className="w-3 h-3 mr-1" />
                  Latent Space Ready
                </Badge>
              )}
              {state.generatedAudio && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                  <Music className="w-3 h-3 mr-1" />
                  Audio Generated
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-black/20">
              <TabsTrigger value="synthesis" className="data-[state=active]:bg-purple-600">
                <Zap className="w-4 h-4 mr-2" />
                Synthesis
              </TabsTrigger>
              <TabsTrigger value="interpolation" className="data-[state=active]:bg-purple-600">
                <GitBranch className="w-4 h-4 mr-2" />
                Interpolation
              </TabsTrigger>
              <TabsTrigger value="variations" className="data-[state=active]:bg-purple-600">
                <Wand2 className="w-4 h-4 mr-2" />
                Variations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="synthesis" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={handleGenerateRandom}
                    disabled={state.isProcessing}
                    className="w-full h-32 bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 hover:from-purple-700 hover:via-blue-700 hover:to-purple-800 flex flex-col items-center justify-center space-y-3 text-lg font-semibold"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Shuffle className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <div>Generate Random</div>
                      <div className="text-sm font-normal opacity-80">Sample latent space</div>
                    </div>
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={handleReconstruct}
                    disabled={state.isProcessing || !audioFile}
                    variant="outline"
                    className="w-full h-32 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/40 flex flex-col items-center justify-center space-y-3 text-lg font-semibold"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <div>Reconstruct</div>
                      <div className="text-sm font-normal opacity-80">Encode → Decode</div>
                    </div>
                  </Button>
                </motion.div>
              </div>
              
              {/* Audio Playback Controls */}
              <AnimatePresence>
                {state.generatedAudio && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="bg-black/20 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Button
                              onClick={() => state.generatedAudio && playAudio(state.generatedAudio)}
                              disabled={isPlaying}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Play Generated
                            </Button>
                            
                            <Button
                              onClick={stopAudio}
                              disabled={!isPlaying}
                              variant="outline"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Stop
                            </Button>
                          </div>
                          
                          <div className="flex items-center space-x-3">
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
                            
                            <div className="w-20">
                              <Slider
                                value={volume}
                                onValueChange={(value) => {
                                  setVolume(value)
                                  if (currentAudio) {
                                    currentAudio.volume = isMuted ? 0 : value[0] / 100
                                  }
                                }}
                                max={100}
                                step={1}
                                className="[&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600"
                              />
                            </div>
                            
                            <Button
                              onClick={() => state.generatedAudio && downloadAudio(state.generatedAudio)}
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
            
            <TabsContent value="interpolation" className="space-y-6 mt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center border border-white/20">
                  <GitBranch className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Latent Space Interpolation</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Blend between two audio samples by interpolating through the latent space.
                    Upload two audio files to create smooth transitions.
                  </p>
                </div>
                
                <Button 
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="variations" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Generate Variations</h3>
                  <p className="text-gray-400 text-sm">
                    Create variations of the current audio by exploring nearby regions in latent space
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={() => handleCreateVariations('subtle')}
                      disabled={state.isProcessing}
                      variant="outline" 
                      className="w-full h-20 border-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50 flex flex-col items-center justify-center"
                    >
                      <Wand2 className="w-5 h-5 mb-2" />
                      <div className="text-center">
                        <div className="font-semibold">Subtle Variation</div>
                        <div className="text-xs opacity-70">Small changes</div>
                      </div>
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={() => handleCreateVariations('dramatic')}
                      disabled={state.isProcessing}
                      variant="outline" 
                      className="w-full h-20 border-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 flex flex-col items-center justify-center"
                    >
                      <Zap className="w-5 h-5 mb-2" />
                      <div className="text-center">
                        <div className="font-semibold">Dramatic Variation</div>
                        <div className="text-xs opacity-70">Bold changes</div>
                      </div>
                    </Button>
                  </motion.div>
                </div>
                
                {/* Generated Variations */}
                <AnimatePresence>
                  {generatedVariations.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-3"
                    >
                      <h4 className="text-white font-semibold">Generated Variations</h4>
                      <div className="grid gap-3">
                        {generatedVariations.map((variation, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="bg-black/20 border-white/10">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                                      <Music className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-white font-medium">Variation {index + 1}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      onClick={() => playAudio(variation)}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Play className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      onClick={() => downloadAudio(variation, `variation_${index + 1}.wav`)}
                                      variant="outline"
                                      size="sm"
                                      className="border-white/20 text-white hover:bg-white/10"
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default NeuralSynthesis