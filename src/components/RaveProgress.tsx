import { motion } from 'framer-motion'
import {
  Brain,
  Music,
  Zap,
  Disc,
  Waves,
  Volume2,
  Activity,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface RaveProgressProps {
  stage: string
  progress: number
  currentStep: number
  totalSteps: number
}

const RaveProgress: React.FC<RaveProgressProps> = ({
  stage,
  progress,
  currentStep,
  totalSteps
}) => {
  const getStageIcon = (stageName: string) => {
    switch (stageName) {
      case 'analyzing':
        return <Brain className="w-6 h-6" />
      case 'extracting':
        return <Music className="w-6 h-6" />
      case 'tempo-matching':
        return <Activity className="w-6 h-6" />
      case 'beat-detection':
        return <Waves className="w-6 h-6" />
      case 'mixing':
        return <Disc className="w-6 h-6" />
      case 'effects':
        return <Volume2 className="w-6 h-6" />
      case 'finalizing':
        return <Sparkles className="w-6 h-6" />
      default:
        return <Zap className="w-6 h-6" />
    }
  }

  const getStageColor = (stageName: string) => {
    switch (stageName) {
      case 'analyzing':
        return 'from-blue-600 to-cyan-600'
      case 'extracting':
        return 'from-green-600 to-emerald-600'
      case 'tempo-matching':
        return 'from-purple-600 to-violet-600'
      case 'beat-detection':
        return 'from-pink-600 to-rose-600'
      case 'mixing':
        return 'from-orange-600 to-red-600'
      case 'effects':
        return 'from-yellow-600 to-amber-600'
      case 'finalizing':
        return 'from-indigo-600 to-purple-600'
      default:
        return 'from-gray-600 to-slate-600'
    }
  }

  const getStageDescription = (stageName: string) => {
    switch (stageName) {
      case 'analyzing':
        return 'Analyzing song structure, key signatures, and musical elements'
      case 'extracting':
        return 'Extracting high-quality audio from source URLs'
      case 'tempo-matching':
        return 'Synchronizing tempos and finding optimal mix points'
      case 'beat-detection':
        return 'Detecting beats and analyzing rhythmic patterns'
      case 'mixing':
        return 'Blending tracks with AI-powered crossfading'
      case 'effects':
        return 'Applying professional audio effects and mastering'
      case 'finalizing':
        return 'Finalizing your epic mashup with quality enhancements'
      default:
        return 'Processing your mashup with advanced AI algorithms'
    }
  }

  const processingSteps = [
    { name: 'analyzing', label: 'AI Analysis' },
    { name: 'extracting', label: 'Audio Extract' },
    { name: 'tempo-matching', label: 'Tempo Sync' },
    { name: 'beat-detection', label: 'Beat Analysis' },
    { name: 'mixing', label: 'AI Mixing' },
    { name: 'effects', label: 'Effects' },
    { name: 'finalizing', label: 'Finalizing' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-black/40 border-purple-500/30 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  className={`w-12 h-12 bg-gradient-to-r ${getStageColor(stage)} rounded-xl flex items-center justify-center`}
                  animate={{ rotate: stage === 'mixing' ? 360 : 0 }}
                  transition={{ duration: 2, repeat: stage === 'mixing' ? Infinity : 0, ease: "linear" }}
                >
                  {getStageIcon(stage)}
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-white flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-purple-400 animate-pulse" />
                    Creating Your Mashup
                  </h3>
                  <p className="text-gray-400">{getStageDescription(stage)}</p>
                </div>
              </div>
              
              <Badge 
                variant="outline" 
                className="border-purple-500/30 text-purple-300"
              >
                Step {currentStep} of {totalSteps}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-400">
                <span className="capitalize font-medium">{stage.replace('-', ' ')}</span>
                <span>{progress}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-3 bg-black/40"
              />
            </div>

            {/* Processing Steps */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              {processingSteps.map((step, index) => {
                const isActive = step.name === stage
                const isCompleted = processingSteps.findIndex(s => s.name === stage) > index
                const isPending = processingSteps.findIndex(s => s.name === stage) < index

                return (
                  <motion.div
                    key={step.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-500/20 border border-green-500/40' 
                        : isActive 
                        ? `bg-gradient-to-r ${getStageColor(step.name)} border border-white/20`
                        : isPending
                        ? 'bg-gray-600/20 border border-gray-600/40'
                        : 'bg-black/20 border border-white/10'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : isActive ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {getStageIcon(step.name)}
                        </motion.div>
                      ) : (
                        <div className={`w-5 h-5 ${isPending ? 'text-gray-500' : 'text-gray-600'}`}>
                          {getStageIcon(step.name)}
                        </div>
                      )}
                    </div>
                    <p className={`text-xs font-medium ${
                      isCompleted 
                        ? 'text-green-400' 
                        : isActive 
                        ? 'text-white'
                        : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </motion.div>
                )
              })}
            </div>

            {/* Fun Messages */}
            <motion.div
              key={stage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </motion.div>
                <span className="text-purple-300 text-sm font-medium">
                  {stage === 'analyzing' && "🎵 Discovering musical DNA..."}
                  {stage === 'extracting' && "🎧 Pulling crystal-clear audio..."}
                  {stage === 'tempo-matching' && "⚡ Syncing the perfect rhythm..."}
                  {stage === 'beat-detection' && "🥁 Finding the heartbeat..."}
                  {stage === 'mixing' && "🎛️ Weaving sonic magic..."}
                  {stage === 'effects' && "✨ Adding professional polish..."}
                  {stage === 'finalizing' && "🎉 Almost ready to blow your mind!"}
                </span>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default RaveProgress