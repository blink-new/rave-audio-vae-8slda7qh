import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Download,
  Trash2,
  Music,
  Zap,
  Disc,
  Volume2,
  VolumeX,
  RotateCcw,
  Shuffle,
  GitBranch,
  Activity,
  Clock,
  Upload,
  FileAudio,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import useAudioMixing from '@/hooks/useAudioMixing';
import type { MixingParams } from '@/utils/audioMixing';

interface AudioMashupProps {
  onFileUpload?: (file: File) => void;
}

const AudioMashup: React.FC<AudioMashupProps> = ({ onFileUpload }) => {
  const [mixingParams, setMixingParams] = useState<MixingParams>({
    crossfadeTime: 4.0,
    tempo: 128,
    volume1: 0.8,
    volume2: 0.8,
    bassBoost: 0.2,
    trebleBoost: 0.1,
    reverbLevel: 0.1,
    compressionRatio: 3.0
  });

  const [trackA, setTrackA] = useState<{ id: string; file: File } | null>(null);
  const [trackB, setTrackB] = useState<{ id: string; file: File } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isDraggingA, setIsDraggingA] = useState(false);
  const [isDraggingB, setIsDraggingB] = useState(false);
  
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const dragCounterA = useRef(0);
  const dragCounterB = useRef(0);

  const {
    state,
    currentOperation,
    loadAudioFile,
    createMashup,
    removeTrack,
    clearAllTracks,
    clearError,
    getTrack,
    getBeatInfo
  } = useAudioMixing();

  // File validation
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return `Unsupported format. Please use: ${allowedTypes.join(', ')}`;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      return 'File too large. Maximum size: 50MB';
    }

    return null;
  };

  // Handle file upload for specific track
  const handleTrackUpload = useCallback(async (file: File, track: 'A' | 'B') => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (onFileUpload) {
      onFileUpload(file);
    }

    const loadedTrack = await loadAudioFile(file);
    if (loadedTrack) {
      if (track === 'A') {
        setTrackA({ id: loadedTrack.id, file });
      } else {
        setTrackB({ id: loadedTrack.id, file });
      }
      toast.success(`Track ${track} loaded: "${file.name}"`);
    }
  }, [loadAudioFile, onFileUpload]);

  // Drag and drop handlers for Track A
  const handleDragEnterA = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterA.current++;
    if (dragCounterA.current === 1) {
      setIsDraggingA(true);
    }
  }, []);

  const handleDragLeaveA = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterA.current--;
    if (dragCounterA.current === 0) {
      setIsDraggingA(false);
    }
  }, []);

  const handleDropA = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingA(false);
    dragCounterA.current = 0;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleTrackUpload(files[0], 'A');
    }
  }, [handleTrackUpload]);

  // Drag and drop handlers for Track B
  const handleDragEnterB = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterB.current++;
    if (dragCounterB.current === 1) {
      setIsDraggingB(true);
    }
  }, []);

  const handleDragLeaveB = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterB.current--;
    if (dragCounterB.current === 0) {
      setIsDraggingB(false);
    }
  }, []);

  const handleDropB = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingB(false);
    dragCounterB.current = 0;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleTrackUpload(files[0], 'B');
    }
  }, [handleTrackUpload]);

  // Create mashup from both tracks
  const handleCreateMashup = useCallback(async () => {
    if (!trackA || !trackB) {
      toast.error('Please upload both Track A and Track B to create a mashup');
      return;
    }

    const audioUrl = await createMashup(trackA.id, trackB.id, mixingParams);
    if (audioUrl) {
      toast.success('Mashup created successfully!');
    }
  }, [trackA, trackB, mixingParams, createMashup]);

  // Remove track
  const removeTrackFile = useCallback((track: 'A' | 'B') => {
    if (track === 'A' && trackA) {
      removeTrack(trackA.id);
      setTrackA(null);
    } else if (track === 'B' && trackB) {
      removeTrack(trackB.id);
      setTrackB(null);
    }
  }, [trackA, trackB, removeTrack]);

  // Play audio
  const playAudio = useCallback((audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }

    const audio = new Audio(audioUrl);
    audio.volume = isMuted ? 0 : volume[0] / 100;
    
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      toast.error('Failed to play audio');
      setIsPlaying(false);
    };
    
    setCurrentAudio(audio);
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        toast.error('Failed to play audio');
        setIsPlaying(false);
      });
  }, [currentAudio, volume, isMuted]);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  }, [currentAudio]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (currentAudio) {
      currentAudio.volume = !isMuted ? 0 : volume[0] / 100;
    }
  }, [currentAudio, isMuted, volume]);

  // Download audio
  const downloadAudio = useCallback((audioUrl: string, filename: string = 'mashup.wav') => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started!');
  }, []);

  // Update mixing parameter
  const updateParam = useCallback((param: keyof MixingParams, value: number) => {
    setMixingParams(prev => ({ ...prev, [param]: value }));
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Track upload component
  const TrackUploadArea = ({ 
    track, 
    trackLetter, 
    isDragging, 
    onDragEnter, 
    onDragLeave, 
    onDrop, 
    onFileSelect,
    fileInputRef 
  }: {
    track: { id: string; file: File } | null;
    trackLetter: 'A' | 'B';
    isDragging: boolean;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileSelect: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
  }) => {
    const trackData = track ? getTrack(track.id) : null;
    const beatInfo = track ? getBeatInfo(track.id) : null;
    const color = trackLetter === 'A' ? 'blue' : 'purple';

    return (
      <Card className={`h-full transition-all duration-300 ${
        isDragging 
          ? `bg-${color}-500/20 border-${color}-500/50` 
          : 'bg-black/40 border-white/10 hover:border-white/20'
      }`}>
        <CardHeader>
          <CardTitle className={`text-white flex items-center text-lg`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              trackLetter === 'A' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600'
            }`}>
              <span className="text-white font-bold">{trackLetter}</span>
            </div>
            Track {trackLetter}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {track ? 'Track loaded and ready to mix' : `Upload your ${trackLetter === 'A' ? 'first' : 'second'} audio track`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!track ? (
            // Upload area
            <motion.div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? `border-${color}-400 bg-${color}-500/10`
                  : 'border-white/20 hover:border-white/40'
              }`}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={onDrop}
              onClick={onFileSelect}
              animate={{ scale: isDragging ? 1.02 : 1 }}
            >
              <motion.div
                animate={{
                  scale: isDragging ? 1.1 : 1,
                  rotate: isDragging ? 5 : 0,
                }}
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  isDragging
                    ? `bg-gradient-to-r from-${color}-600 to-${color === 'blue' ? 'cyan' : 'pink'}-600`
                    : `bg-gradient-to-r from-${color}-600/20 to-${color === 'blue' ? 'cyan' : 'pink'}-600/20 border border-white/20`
                }`}
              >
                <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : `text-${color}-400`}`} />
              </motion.div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                {isDragging ? `Drop Track ${trackLetter} here` : `Upload Track ${trackLetter}`}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Drag and drop your audio file or click to browse
              </p>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <FileAudio className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </motion.div>
          ) : (
            // Track info
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-4 rounded-lg bg-gradient-to-r ${
                trackLetter === 'A' 
                  ? 'from-blue-600/20 to-cyan-600/20 border border-blue-500/30'
                  : 'from-purple-600/20 to-pink-600/20 border border-purple-500/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      trackLetter === 'A' 
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                        : 'bg-gradient-to-r from-purple-600 to-pink-600'
                    }`}>
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{track.file.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>{formatFileSize(track.file.size)}</span>
                        {trackData && (
                          <>
                            <span>•</span>
                            <span>{trackData.duration.toFixed(1)}s</span>
                          </>
                        )}
                        {beatInfo && (
                          <>
                            <span>•</span>
                            <span>{beatInfo.bpm.toFixed(0)} BPM</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeTrackFile(trackLetter)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {trackData && (
                  <Button
                    onClick={() => playAudio(trackData.url)}
                    variant="outline"
                    size="sm"
                    className={`w-full ${
                      trackLetter === 'A' 
                        ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
                        : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                    }`}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Preview Track {trackLetter}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    );
  };

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
                      <Disc className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-purple-400" />
                        Audio Processing Active
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

      {/* Main Mashup Interface */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center text-xl">
                <Users className="w-6 h-6 mr-3 text-orange-400" />
                Audio Mashup Studio
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Create professional mashups using advanced audio processing algorithms from both file uploads and URL extraction
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`${
                trackA && trackB 
                  ? 'border-green-500/30 text-green-400' 
                  : 'border-gray-500/30 text-gray-400'
              }`}>
                {(trackA ? 1 : 0) + (trackB ? 1 : 0)}/2 tracks loaded
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Track Upload Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrackUploadArea
              track={trackA}
              trackLetter="A"
              isDragging={isDraggingA}
              onDragEnter={handleDragEnterA}
              onDragLeave={handleDragLeaveA}
              onDrop={handleDropA}
              onFileSelect={() => fileInputARef.current?.click()}
              fileInputRef={fileInputARef}
            />
            
            <TrackUploadArea
              track={trackB}
              trackLetter="B"
              isDragging={isDraggingB}
              onDragEnter={handleDragEnterB}
              onDragLeave={handleDragLeaveB}
              onDrop={handleDropB}
              onFileSelect={() => fileInputBRef.current?.click()}
              fileInputRef={fileInputBRef}
            />
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputARef}
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                handleTrackUpload(files[0], 'A');
              }
            }}
            className="hidden"
          />
          <input
            ref={fileInputBRef}
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                handleTrackUpload(files[0], 'B');
              }
            }}
            className="hidden"
          />

          {/* Mixing Controls - Only show when both tracks are loaded */}
          <AnimatePresence>
            {trackA && trackB && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Separator className="bg-white/10" />
                
                {/* Mixing Parameters */}
                <div>
                  <h4 className="text-white font-semibold mb-4 flex items-center">
                    <GitBranch className="w-5 h-5 mr-2 text-orange-400" />
                    Mixing Controls
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <label className="text-gray-300">Crossfade Time</label>
                          <span className="text-blue-400">{mixingParams.crossfadeTime.toFixed(1)}s</span>
                        </div>
                        <Slider
                          value={[mixingParams.crossfadeTime]}
                          onValueChange={([value]) => updateParam('crossfadeTime', value)}
                          max={10.0}
                          min={0.5}
                          step={0.1}
                          className="[&_[role=slider]]:bg-blue-600 [&_[role=slider]]:border-blue-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <label className="text-gray-300">Track A Volume</label>
                          <span className="text-blue-400">{(mixingParams.volume1 * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[mixingParams.volume1]}
                          onValueChange={([value]) => updateParam('volume1', value)}
                          max={1.0}
                          min={0.0}
                          step={0.05}
                          className="[&_[role=slider]]:bg-blue-600 [&_[role=slider]]:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <label className="text-gray-300">Target Tempo (BPM)</label>
                          <span className="text-purple-400">{mixingParams.tempo}</span>
                        </div>
                        <Slider
                          value={[mixingParams.tempo]}
                          onValueChange={([value]) => updateParam('tempo', value)}
                          max={180}
                          min={80}
                          step={1}
                          className="[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <label className="text-gray-300">Track B Volume</label>
                          <span className="text-purple-400">{(mixingParams.volume2 * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[mixingParams.volume2]}
                          onValueChange={([value]) => updateParam('volume2', value)}
                          max={1.0}
                          min={0.0}
                          step={0.05}
                          className="[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Audio Effects */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <label className="text-gray-300">Bass Boost</label>
                        <span className="text-orange-400">{(mixingParams.bassBoost * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[mixingParams.bassBoost]}
                        onValueChange={([value]) => updateParam('bassBoost', value)}
                        max={1.0}
                        min={0.0}
                        step={0.05}
                        className="[&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <label className="text-gray-300">Treble Boost</label>
                        <span className="text-yellow-400">{(mixingParams.trebleBoost * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[mixingParams.trebleBoost]}
                        onValueChange={([value]) => updateParam('trebleBoost', value)}
                        max={1.0}
                        min={0.0}
                        step={0.05}
                        className="[&_[role=slider]]:bg-yellow-600 [&_[role=slider]]:border-yellow-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <label className="text-gray-300">Reverb</label>
                        <span className="text-cyan-400">{(mixingParams.reverbLevel * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[mixingParams.reverbLevel]}
                        onValueChange={([value]) => updateParam('reverbLevel', value)}
                        max={0.5}
                        min={0.0}
                        step={0.02}
                        className="[&_[role=slider]]:bg-cyan-600 [&_[role=slider]]:border-cyan-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Create Mashup Button */}
                <div className="text-center">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleCreateMashup}
                      disabled={state.isProcessing}
                      className="w-full max-w-md h-16 bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 hover:from-orange-700 hover:via-red-700 hover:to-orange-800 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <Shuffle className="w-5 h-5" />
                        </div>
                        <span>Create Mashup</span>
                      </div>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Generated Mashup */}
      <AnimatePresence>
        {state.mixedAudio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-black/40 border-green-500/30 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Disc className="w-6 h-6 mr-3 text-green-400" />
                  Generated Mashup
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Your audio mashup is ready for playback and download
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={() => playAudio(state.mixedAudio!)}
                      disabled={isPlaying}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Mashup
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
                          setVolume(value);
                          if (currentAudio) {
                            currentAudio.volume = isMuted ? 0 : value[0] / 100;
                          }
                        }}
                        max={100}
                        step={1}
                        className="[&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600"
                      />
                    </div>
                    
                    <Button
                      onClick={() => downloadAudio(state.mixedAudio!, 'mashup.wav')}
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
    </div>
  );
};

export default AudioMashup;