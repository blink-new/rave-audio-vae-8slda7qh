import { useState, useCallback } from 'react';
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
  Clock
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

  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

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

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (onFileUpload) {
      onFileUpload(file);
    }

    const track = await loadAudioFile(file);
    if (track) {
      toast.success(`Track "${track.name}" loaded successfully!`);
    }
  }, [loadAudioFile, onFileUpload]);

  // Toggle track selection
  const toggleTrackSelection = useCallback((trackId: string) => {
    setSelectedTracks(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else if (prev.length < 2) {
        return [...prev, trackId];
      } else {
        // Replace first selected track
        return [prev[1], trackId];
      }
    });
  }, []);

  // Create mashup from selected tracks
  const handleCreateMashup = useCallback(async () => {
    if (selectedTracks.length !== 2) {
      toast.error('Please select exactly 2 tracks to create a mashup');
      return;
    }

    const audioUrl = await createMashup(selectedTracks[0], selectedTracks[1], mixingParams);
    if (audioUrl) {
      toast.success('Mashup created successfully!');
    }
  }, [selectedTracks, mixingParams, createMashup]);

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
      .then(() => {
        setIsPlaying(true);
        toast.success('Playing audio');
      })
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

      {/* File Upload */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Music className="w-5 h-5 mr-2 text-purple-400" />
            Audio Tracks
          </CardTitle>
          <CardDescription className="text-gray-400">
            Load audio files to create mashups. Select exactly 2 tracks to mix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => document.getElementById('audio-file-input')?.click()}
              disabled={state.isProcessing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Music className="w-4 h-4 mr-2" />
              Load Audio File
            </Button>
            
            {state.loadedTracks.length > 0 && (
              <Button
                onClick={clearAllTracks}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              {state.loadedTracks.length} tracks loaded
            </Badge>
          </div>

          <input
            id="audio-file-input"
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />

          {/* Loaded Tracks */}
          <AnimatePresence>
            {state.loadedTracks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <Separator className="bg-white/10" />
                <div className="grid gap-3">
                  {state.loadedTracks.map((track, index) => {
                    const beatInfo = getBeatInfo(track.id);
                    const isSelected = selectedTracks.includes(track.id);
                    
                    return (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className={`transition-all duration-200 ${
                          isSelected 
                            ? 'bg-purple-500/20 border-purple-500/50' 
                            : 'bg-black/20 border-white/10 hover:border-white/20'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Button
                                  onClick={() => toggleTrackSelection(track.id)}
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={isSelected ? 
                                    'bg-purple-600 hover:bg-purple-700' : 
                                    'border-white/20 text-white hover:bg-white/10'
                                  }
                                >
                                  {isSelected ? '✓' : '+'}
                                </Button>
                                
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                                  <Music className="w-5 h-5 text-white" />
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                  <p className="text-white font-medium truncate">
                                    {track.name}
                                  </p>
                                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                                    <span>{track.duration.toFixed(1)}s</span>
                                    {beatInfo && (
                                      <>
                                        <span>•</span>
                                        <span>{beatInfo.bpm.toFixed(0)} BPM</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Button
                                  onClick={() => playAudio(track.url)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  onClick={() => removeTrack(track.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Mixing Controls */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center">
                <GitBranch className="w-6 h-6 mr-3 text-orange-400" />
                Mashup Creation
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Mix two audio tracks together with professional effects
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`${
                selectedTracks.length === 2 
                  ? 'border-green-500/30 text-green-400' 
                  : 'border-gray-500/30 text-gray-400'
              }`}>
                {selectedTracks.length}/2 tracks selected
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Mixing Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Timing & Crossfade</h4>
              
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
            </div>

            <div className="space-y-4">
              <h4 className="text-white font-semibold">Volume & Effects</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label className="text-gray-300">Track 1 Volume</label>
                  <span className="text-green-400">{(mixingParams.volume1 * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[mixingParams.volume1]}
                  onValueChange={([value]) => updateParam('volume1', value)}
                  max={1.0}
                  min={0.0}
                  step={0.05}
                  className="[&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <label className="text-gray-300">Track 2 Volume</label>
                  <span className="text-green-400">{(mixingParams.volume2 * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[mixingParams.volume2]}
                  onValueChange={([value]) => updateParam('volume2', value)}
                  max={1.0}
                  min={0.0}
                  step={0.05}
                  className="[&_[role=slider]]:bg-green-600 [&_[role=slider]]:border-green-600"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Audio Effects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <Separator className="bg-white/10" />

          {/* Create Mashup Button */}
          <div className="text-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleCreateMashup}
                disabled={state.isProcessing || selectedTracks.length !== 2}
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
            
            {selectedTracks.length !== 2 && (
              <p className="text-gray-400 text-sm mt-2">
                {selectedTracks.length === 0 && 'Select 2 tracks to create a mashup'}
                {selectedTracks.length === 1 && 'Select 1 more track to create a mashup'}
                {selectedTracks.length > 2 && 'Too many tracks selected - only 2 allowed'}
              </p>
            )}
          </div>
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