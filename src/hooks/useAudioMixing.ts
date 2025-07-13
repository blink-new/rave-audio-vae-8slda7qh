import { useState, useRef, useCallback } from 'react';
import AudioMixer, { AudioTrack, MixingParams, BeatDetectionResult } from '@/utils/audioMixing';

export interface MixingState {
  isProcessing: boolean;
  progress: number;
  loadedTracks: AudioTrack[];
  mixedAudio: string | null;
  beatInfo: { [trackId: string]: BeatDetectionResult };
  error: string | null;
}

export interface MixingOperation {
  type: 'load' | 'analyze' | 'mix' | 'process';
  progress: number;
  message: string;
}

export const useAudioMixing = () => {
  const [state, setState] = useState<MixingState>({
    isProcessing: false,
    progress: 0,
    loadedTracks: [],
    mixedAudio: null,
    beatInfo: {},
    error: null
  });

  const [currentOperation, setCurrentOperation] = useState<MixingOperation | null>(null);
  const mixerRef = useRef<AudioMixer | null>(null);

  // Initialize mixer
  if (!mixerRef.current) {
    mixerRef.current = new AudioMixer();
  }

  // Update processing state
  const updateProgress = useCallback((operation: Partial<MixingOperation>) => {
    setCurrentOperation(prev => prev ? { ...prev, ...operation } : null);
    setState(prev => ({ ...prev, progress: operation.progress || prev.progress }));
  }, []);

  // Load audio file and analyze it
  const loadAudioFile = useCallback(async (file: File): Promise<AudioTrack | null> => {
    if (!mixerRef.current) return null;

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    setCurrentOperation({
      type: 'load',
      progress: 0,
      message: 'Loading audio file...'
    });

    try {
      updateProgress({ progress: 20, message: 'Decoding audio data...' });
      const track = await mixerRef.current.loadAudioTrack(file);

      updateProgress({ progress: 60, message: 'Analyzing beats and tempo...' });
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing

      const beatInfo = mixerRef.current.detectBeats(track.buffer);

      updateProgress({ progress: 100, message: 'Audio loaded successfully!' });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        loadedTracks: [...prev.loadedTracks, track],
        beatInfo: { ...prev.beatInfo, [track.id]: beatInfo },
        progress: 100
      }));

      setCurrentOperation(null);
      return track;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audio file';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        progress: 0
      }));
      setCurrentOperation(null);
      return null;
    }
  }, [updateProgress]);

  // Create mashup from two tracks
  const createMashup = useCallback(async (
    track1Id: string, 
    track2Id: string, 
    params: MixingParams
  ): Promise<string | null> => {
    if (!mixerRef.current) return null;

    const track1 = state.loadedTracks.find(t => t.id === track1Id);
    const track2 = state.loadedTracks.find(t => t.id === track2Id);

    if (!track1 || !track2) {
      setState(prev => ({ ...prev, error: 'Please select two tracks to mix' }));
      return null;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    setCurrentOperation({
      type: 'mix',
      progress: 0,
      message: 'Preparing mashup...'
    });

    try {
      updateProgress({ progress: 10, message: 'Analyzing track synchronization...' });
      await new Promise(resolve => setTimeout(resolve, 800));

      updateProgress({ progress: 30, message: 'Time-stretching and beat matching...' });
      await new Promise(resolve => setTimeout(resolve, 1200));

      updateProgress({ progress: 60, message: 'Mixing tracks with crossfade...' });
      const mixedBuffer = await mixerRef.current.createMashup(track1, track2, params);

      updateProgress({ progress: 85, message: 'Applying effects and finalizing...' });
      await new Promise(resolve => setTimeout(resolve, 600));

      updateProgress({ progress: 95, message: 'Rendering audio output...' });
      const audioURL = await mixerRef.current.createAudioURL(mixedBuffer);

      updateProgress({ progress: 100, message: 'Mashup created successfully!' });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        mixedAudio: audioURL,
        progress: 100
      }));

      setCurrentOperation(null);
      return audioURL;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create mashup';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        progress: 0
      }));
      setCurrentOperation(null);
      return null;
    }
  }, [state.loadedTracks, updateProgress]);

  // Remove a loaded track
  const removeTrack = useCallback((trackId: string) => {
    setState(prev => {
      const trackToRemove = prev.loadedTracks.find(t => t.id === trackId);
      if (trackToRemove) {
        URL.revokeObjectURL(trackToRemove.url);
      }

      const newBeatInfo = { ...prev.beatInfo };
      delete newBeatInfo[trackId];

      return {
        ...prev,
        loadedTracks: prev.loadedTracks.filter(t => t.id !== trackId),
        beatInfo: newBeatInfo
      };
    });
  }, []);

  // Clear all tracks
  const clearAllTracks = useCallback(() => {
    state.loadedTracks.forEach(track => {
      URL.revokeObjectURL(track.url);
    });

    if (state.mixedAudio) {
      URL.revokeObjectURL(state.mixedAudio);
    }

    setState({
      isProcessing: false,
      progress: 0,
      loadedTracks: [],
      mixedAudio: null,
      beatInfo: {},
      error: null
    });
  }, [state.loadedTracks, state.mixedAudio]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get track by ID
  const getTrack = useCallback((trackId: string): AudioTrack | undefined => {
    return state.loadedTracks.find(t => t.id === trackId);
  }, [state.loadedTracks]);

  // Get beat info for track
  const getBeatInfo = useCallback((trackId: string): BeatDetectionResult | undefined => {
    return state.beatInfo[trackId];
  }, [state.beatInfo]);

  return {
    state,
    currentOperation,
    loadAudioFile,
    createMashup,
    removeTrack,
    clearAllTracks,
    clearError,
    getTrack,
    getBeatInfo
  };
};

export default useAudioMixing;