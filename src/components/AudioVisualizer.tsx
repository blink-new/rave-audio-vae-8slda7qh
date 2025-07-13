import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import type { AudioAnalysisData, PlaybackState } from '@/hooks/useAudioAnalysis';

interface AudioVisualizerProps {
  analysisData: AudioAnalysisData | null;
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analysisData,
  playbackState,
  onPlay,
  onPause,
  onStop,
  onSeek
}) => {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const frequencyCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !analysisData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { waveformData, duration } = analysisData;
    const { currentTime, isPlaying } = playbackState;

    // Clear canvas
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    const centerY = height / 2;
    const amplitude = height * 0.4;

    // Background waveform
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < waveformData.length; i++) {
      const x = (i / waveformData.length) * width;
      const y = centerY + (waveformData[i] * amplitude);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Played portion (if playing)
    if (duration > 0) {
      const playProgress = currentTime / duration;
      const playedWidth = width * playProgress;

      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < waveformData.length * playProgress; i++) {
        const x = (i / waveformData.length) * width;
        const y = centerY + (waveformData[i] * amplitude);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Playhead
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playedWidth, 0);
      ctx.lineTo(playedWidth, height);
      ctx.stroke();

      // Glow effect for active waveform
      if (isPlaying) {
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
    }

    // Center line
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }, [analysisData, playbackState]);

  // Draw real-time frequency spectrum
  const drawFrequencySpectrum = useCallback(() => {
    const canvas = frequencyCanvasRef.current;
    if (!canvas || !analysisData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { frequencyData, sampleRate } = analysisData;

    // Clear canvas
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, width, height);

    // Draw frequency bars
    const barWidth = width / frequencyData.length;
    const nyquist = sampleRate / 2;

    for (let i = 0; i < frequencyData.length; i++) {
      const value = (frequencyData[i] + 140) / 140; // Normalize dB values
      const barHeight = Math.max(0, value * height);
      
      const x = i * barWidth;
      const y = height - barHeight;

      // Create gradient based on frequency
      const hue = (i / frequencyData.length) * 240; // Blue to red
      ctx.fillStyle = `hsl(${hue}, 70%, ${50 + value * 30}%)`;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Draw frequency labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    
    const labelPositions = [0, 0.25, 0.5, 0.75, 1];
    labelPositions.forEach(pos => {
      const freq = Math.round((pos * nyquist) / 1000);
      const x = pos * width;
      ctx.fillText(`${freq}k`, x, height - 5);
    });
  }, [analysisData]);

  // Draw spectrogram
  const drawSpectrogram = useCallback(() => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas || !analysisData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { spectrogramData } = analysisData;

    if (spectrogramData.length === 0) return;

    // Clear canvas
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, width, height);

    const timeSteps = spectrogramData.length;
    const freqBins = spectrogramData[0].length;
    const pixelWidth = width / timeSteps;
    const pixelHeight = height / freqBins;

    // Draw spectrogram
    for (let t = 0; t < timeSteps; t++) {
      for (let f = 0; f < freqBins; f++) {
        const magnitude = spectrogramData[t][f];
        const normalizedMag = Math.max(0, (magnitude + 100) / 100); // Normalize dB
        
        const x = t * pixelWidth;
        const y = height - (f * pixelHeight) - pixelHeight; // Flip Y axis
        
        // Color based on magnitude
        const intensity = Math.min(1, normalizedMag);
        const hue = 240 + (intensity * 120); // Blue to yellow
        const lightness = 20 + (intensity * 60);
        
        ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
        ctx.fillRect(x, y, Math.ceil(pixelWidth), Math.ceil(pixelHeight));
      }
    }

    // Add time markers
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    
    const timeMarkers = [0, 0.25, 0.5, 0.75, 1];
    timeMarkers.forEach(pos => {
      const time = pos * (analysisData.duration || 0);
      const x = pos * width;
      ctx.fillText(`${time.toFixed(1)}s`, x, height - 5);
    });
  }, [analysisData]);

  // Animation loop
  const animate = useCallback(() => {
    drawWaveform();
    drawFrequencySpectrum();
    
    if (playbackState.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [drawWaveform, drawFrequencySpectrum, playbackState.isPlaying]);

  // Handle canvas click for seeking
  const handleWaveformClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !analysisData) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickRatio = x / canvas.width;
    const seekTime = clickRatio * analysisData.duration;
    
    onSeek(seekTime);
  }, [analysisData, onSeek]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Effects
  useEffect(() => {
    if (analysisData && playbackState.isPlaying) {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analysisData, playbackState.isPlaying, animate]);

  useEffect(() => {
    if (analysisData) {
      drawWaveform();
      drawSpectrogram();
    }
  }, [analysisData, drawWaveform, drawSpectrogram]);

  if (!analysisData) {
    return (
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Volume2 className="w-5 h-5 mr-2 text-purple-400" />
            Audio Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-gray-400">
            Upload an audio file to see visualization
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Waveform Visualization */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center">
                <Volume2 className="w-5 h-5 mr-2 text-purple-400" />
                Waveform Analysis
              </CardTitle>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                  {analysisData.sampleRate / 1000}kHz
                </Badge>
                <Badge variant="outline" className="border-green-500/30 text-green-400">
                  {analysisData.channels} Channel{analysisData.channels > 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                  {formatTime(analysisData.duration)}
                </Badge>
              </div>
            </div>
            {playbackState.isLoading && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                Loading...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <canvas
              ref={waveformCanvasRef}
              width={800}
              height={200}
              className="w-full h-48 rounded-lg border border-white/10 cursor-pointer hover:border-purple-500/30 transition-colors"
              onClick={handleWaveformClick}
            />
            
            {/* Progress indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>{formatTime(playbackState.currentTime)}</span>
                <span>{formatTime(playbackState.duration)}</span>
              </div>
              <Progress 
                value={(playbackState.currentTime / playbackState.duration) * 100} 
                className="h-2 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const clickRatio = x / rect.width;
                  onSeek(clickRatio * playbackState.duration);
                }}
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onStop}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={playbackState.isPlaying ? onPause : onPlay}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={playbackState.isLoading}
              >
                {playbackState.isPlaying ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {playbackState.isPlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Frequency Spectrum */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Volume2 className="w-5 h-5 mr-2 text-blue-400" />
              Real-time Frequency Spectrum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <canvas
              ref={frequencyCanvasRef}
              width={800}
              height={150}
              className="w-full h-32 rounded-lg border border-white/10"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Spectrogram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Volume2 className="w-5 h-5 mr-2 text-orange-400" />
              Spectrogram Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <canvas
              ref={spectrogramCanvasRef}
              width={800}
              height={200}
              className="w-full h-48 rounded-lg border border-white/10"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Audio Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Audio Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-gray-400 text-sm">RMS Energy</div>
                <div className="text-xl font-mono text-green-400">
                  {analysisData.features.rms.toFixed(4)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-gray-400 text-sm">Spectral Centroid</div>
                <div className="text-xl font-mono text-blue-400">
                  {Math.round(analysisData.features.spectralCentroid)} Hz
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-gray-400 text-sm">Spectral Rolloff</div>
                <div className="text-xl font-mono text-purple-400">
                  {Math.round(analysisData.features.spectralRolloff)} Hz
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-gray-400 text-sm">Zero Crossing Rate</div>
                <div className="text-xl font-mono text-yellow-400">
                  {analysisData.features.zeroCrossingRate.toFixed(4)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AudioVisualizer;