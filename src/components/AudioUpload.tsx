import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, Music, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface AudioFile {
  file: File
  url: string
  duration?: number
  size: string
  type: string
}

interface AudioUploadProps {
  onFileUpload: (file: File, url: string) => void
  acceptedFormats?: string[]
  maxSizeMB?: number
}

const AudioUpload: React.FC<AudioUploadProps> = ({
  onFileUpload,
  acceptedFormats = ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'],
  maxSizeMB = 50
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<AudioFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.onloadedmetadata = () => {
        resolve(audio.duration)
      }
      audio.onerror = () => resolve(0)
      audio.src = URL.createObjectURL(file)
    })
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !acceptedFormats.includes(fileExtension)) {
      return `Unsupported format. Please use: ${acceptedFormats.join(', ')}`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      return `File too large. Maximum size: ${maxSizeMB}MB`
    }

    return null
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setUploadProgress(0)
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setIsProcessing(false)
      return
    }

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const url = URL.createObjectURL(file)
      const duration = await getAudioDuration(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      const audioFile: AudioFile = {
        file,
        url,
        duration,
        size: formatFileSize(file.size),
        type: file.name.split('.').pop()?.toUpperCase() || 'AUDIO'
      }

      setUploadedFiles(prev => [audioFile, ...prev])
      onFileUpload(file, url)

      setTimeout(() => {
        setIsProcessing(false)
        setUploadProgress(0)
      }, 500)

    } catch (err) {
      setError('Failed to process audio file')
      setIsProcessing(false)
      setUploadProgress(0)
    }
  }

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    processFile(file)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (dragCounter.current === 1) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [handleFileSelect])

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].url)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Main Upload Area */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">
          <motion.div
            className={`relative border-2 border-dashed transition-all duration-300 ${
              isDragging
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-white/20 hover:border-white/40'
            } ${isProcessing ? 'pointer-events-none' : 'cursor-pointer'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            animate={{
              scale: isDragging ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-8 py-12 text-center">
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <Music className="w-8 h-8 text-white animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">Processing Audio</h3>
                      <p className="text-gray-400">Analyzing and encoding your audio file...</p>
                      <div className="max-w-xs mx-auto space-y-2">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-sm text-gray-500">{uploadProgress}% complete</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <motion.div
                      animate={{
                        scale: isDragging ? 1.1 : 1,
                        rotate: isDragging ? 5 : 0,
                      }}
                      className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        isDragging
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                          : 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-white/20'
                      }`}
                    >
                      <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-purple-400'}`} />
                    </motion.div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-white">
                        {isDragging ? 'Drop your audio file here' : 'Upload Audio File'}
                      </h3>
                      <p className="text-gray-400 max-w-md mx-auto">
                        Drag and drop your audio file here, or click to browse. 
                        Supports {acceptedFormats.slice(0, 3).join(', ')} and more.
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {acceptedFormats.map((format) => (
                        <Badge
                          key={format}
                          variant="outline"
                          className="border-white/20 text-gray-400 text-xs uppercase"
                        >
                          {format}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <File className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border-t border-red-500/20 px-6 py-4"
                >
                  <div className="flex items-center justify-center space-x-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setError(null)
                      }}
                      className="text-red-400 hover:text-red-300 p-1 h-auto"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.map(f => `.${f}`).join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h4 className="text-lg font-semibold text-white flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              Uploaded Files ({uploadedFiles.length})
            </h4>
            
            <div className="space-y-2">
              {uploadedFiles.map((audioFile, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-black/20 border-white/10 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">
                              {audioFile.file.name}
                            </p>
                            <div className="flex items-center space-x-3 text-sm text-gray-400">
                              <span>{audioFile.size}</span>
                              <span>•</span>
                              <Badge variant="outline" className="border-white/20 text-gray-400 text-xs">
                                {audioFile.type}
                              </Badge>
                              {audioFile.duration && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(audioFile.duration)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-white p-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
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
  )
}

export default AudioUpload