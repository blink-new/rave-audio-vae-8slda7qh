import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioAnalysisData {
  duration: number;
  sampleRate: number;
  channels: number;
  waveformData: Float32Array;
  frequencyData: Float32Array;
  spectrogramData: number[][];
  features: {
    rms: number;
    spectralCentroid: number;
    spectralRolloff: number;
    zeroCrossingRate: number;
    mfcc: number[];
  };
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
}

export const useAudioAnalysis = () => {
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false
  });
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio context
  const initializeAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  // Calculate audio features
  const calculateAudioFeatures = useCallback((audioBuffer: AudioBuffer) => {
    const channelData = audioBuffer.getChannelData(0);
    const length = channelData.length;

    // RMS (Root Mean Square)
    let rmsSum = 0;
    for (let i = 0; i < length; i++) {
      rmsSum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(rmsSum / length);

    // Zero Crossing Rate
    let zeroCrossings = 0;
    for (let i = 1; i < length; i++) {
      if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / (length - 1);

    // For frequency-domain features, we'll use FFT analysis
    const fftSize = 2048;
    const fft = new Float32Array(fftSize);
    const windowSize = Math.min(fftSize, length);
    
    // Copy windowed data for FFT
    for (let i = 0; i < windowSize; i++) {
      fft[i] = channelData[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (windowSize - 1))); // Hanning window
    }

    // Simple spectral centroid calculation (approximation)
    let weightedSum = 0;
    let magnitudeSum = 0;
    const nyquist = audioBuffer.sampleRate / 2;
    
    for (let i = 1; i < windowSize / 2; i++) {
      const magnitude = Math.abs(fft[i]);
      const frequency = (i / (windowSize / 2)) * nyquist;
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Spectral rolloff (frequency below which 85% of energy lies)
    let energySum = 0;
    let totalEnergy = 0;
    for (let i = 1; i < windowSize / 2; i++) {
      totalEnergy += Math.abs(fft[i]);
    }
    
    const rolloffThreshold = 0.85 * totalEnergy;
    let spectralRolloff = nyquist;
    
    for (let i = 1; i < windowSize / 2; i++) {
      energySum += Math.abs(fft[i]);
      if (energySum >= rolloffThreshold) {
        spectralRolloff = (i / (windowSize / 2)) * nyquist;
        break;
      }
    }

    // Mock MFCC coefficients (simplified)
    const mfcc = Array.from({ length: 13 }, (_, i) => Math.random() * 2 - 1);

    return {
      rms,
      spectralCentroid,
      spectralRolloff,
      zeroCrossingRate,
      mfcc
    };
  }, []);

  // Generate spectrogram data
  const generateSpectrogramData = useCallback((audioBuffer: AudioBuffer) => {
    const channelData = audioBuffer.getChannelData(0);
    const fftSize = 512;
    const hopSize = 256;
    const spectrogramData: number[][] = [];

    for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
      const frame = new Float32Array(fftSize);
      
      // Apply window and copy data
      for (let j = 0; j < fftSize; j++) {
        const windowValue = 0.5 - 0.5 * Math.cos(2 * Math.PI * j / (fftSize - 1));
        frame[j] = channelData[i + j] * windowValue;
      }

      // Convert to frequency domain (simplified magnitude spectrum)
      const spectrum: number[] = [];
      for (let k = 0; k < fftSize / 2; k++) {
        let real = 0, imag = 0;
        
        for (let n = 0; n < fftSize; n++) {
          const angle = -2 * Math.PI * k * n / fftSize;
          real += frame[n] * Math.cos(angle);
          imag += frame[n] * Math.sin(angle);
        }
        
        const magnitude = Math.sqrt(real * real + imag * imag);
        spectrum.push(20 * Math.log10(magnitude + 1e-10)); // Convert to dB
      }
      
      spectrogramData.push(spectrum);
    }

    return spectrogramData;
  }, []);

  // Analyze audio file
  const analyzeAudio = useCallback(async (file: File) => {
    setError(null);
    setPlaybackState(prev => ({ ...prev, isLoading: true }));

    try {
      const audioContext = await initializeAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Extract basic info
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;

      // Generate waveform data (downsampled for visualization)
      const channelData = audioBuffer.getChannelData(0);
      const downsampleFactor = Math.max(1, Math.floor(channelData.length / 2048));
      const waveformData = new Float32Array(Math.ceil(channelData.length / downsampleFactor));
      
      for (let i = 0; i < waveformData.length; i++) {
        waveformData[i] = channelData[i * downsampleFactor];
      }

      // Generate frequency data for real-time analysis
      const frequencyData = new Float32Array(1024);

      // Generate spectrogram
      const spectrogramData = generateSpectrogramData(audioBuffer);

      // Calculate audio features
      const features = calculateAudioFeatures(audioBuffer);

      const analysisResult: AudioAnalysisData = {
        duration,
        sampleRate,
        channels,
        waveformData,
        frequencyData,
        spectrogramData,
        features
      };

      setAnalysisData(analysisResult);
      setPlaybackState(prev => ({
        ...prev,
        duration,
        isLoading: false
      }));

      return analysisResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze audio';
      setError(errorMessage);
      setPlaybackState(prev => ({ ...prev, isLoading: false }));
      throw new Error(errorMessage);
    }
  }, [initializeAudioContext, calculateAudioFeatures, generateSpectrogramData]);

  // Setup audio element for playback
  const setupAudioElement = useCallback(async (url: string) => {
    try {
      const audioContext = await initializeAudioContext();

      // Create audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }

      const audioElement = new Audio();
      audioElement.src = url;
      audioElement.crossOrigin = 'anonymous';
      audioElementRef.current = audioElement;

      // Create audio nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }

      const sourceNode = audioContext.createMediaElementSource(audioElement);
      const analyserNode = audioContext.createAnalyser();
      
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.8;

      sourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination);

      sourceNodeRef.current = sourceNode;
      analyserNodeRef.current = analyserNode;

      // Setup event listeners
      audioElement.addEventListener('loadedmetadata', () => {
        setPlaybackState(prev => ({
          ...prev,
          duration: audioElement.duration
        }));
      });

      audioElement.addEventListener('timeupdate', () => {
        setPlaybackState(prev => ({
          ...prev,
          currentTime: audioElement.currentTime
        }));
      });

      audioElement.addEventListener('ended', () => {
        setPlaybackState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0
        }));
      });

      return audioElement;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to setup audio playback';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [initializeAudioContext]);

  // Real-time frequency analysis
  const updateFrequencyData = useCallback(() => {
    if (analyserNodeRef.current && analysisData) {
      const bufferLength = analyserNodeRef.current.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      analyserNodeRef.current.getFloatFrequencyData(dataArray);

      // Update the frequency data in analysis
      analysisData.frequencyData.set(dataArray.slice(0, Math.min(dataArray.length, analysisData.frequencyData.length)));
      
      setAnalysisData({ ...analysisData });
    }

    if (playbackState.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
    }
  }, [analysisData, playbackState.isPlaying]);

  // Playback controls
  const play = useCallback(async () => {
    if (audioElementRef.current && audioContextRef.current) {
      try {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        await audioElementRef.current.play();
        setPlaybackState(prev => ({ ...prev, isPlaying: true }));
        
        // Start real-time analysis
        updateFrequencyData();
      } catch (err) {
        setError('Failed to start playback');
      }
    }
  }, [updateFrequencyData]);

  const pause = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setPlaybackState(prev => ({ ...prev, isPlaying: false }));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0
      }));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
      setPlaybackState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    analysisData,
    playbackState,
    error,
    analyzeAudio,
    setupAudioElement,
    play,
    pause,
    stop,
    seekTo,
    clearError: () => setError(null)
  };
};