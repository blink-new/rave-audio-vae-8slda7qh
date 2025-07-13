import { useState, useRef, useCallback, useEffect } from 'react';
import NeuralAudioSynthesizer, { LatentVector, SynthesisParams } from '@/utils/neuralSynthesis';

export interface SynthesisState {
  isProcessing: boolean;
  progress: number;
  currentLatent: LatentVector | null;
  generatedAudio: string | null;
  error: string | null;
}

export interface SynthesisOperation {
  type: 'encode' | 'decode' | 'generate' | 'interpolate' | 'variation';
  progress: number;
  message: string;
}

export const useNeuralSynthesis = () => {
  const [state, setState] = useState<SynthesisState>({
    isProcessing: false,
    progress: 0,
    currentLatent: null,
    generatedAudio: null,
    error: null
  });

  const [currentOperation, setCurrentOperation] = useState<SynthesisOperation | null>(null);
  const synthesizerRef = useRef<NeuralAudioSynthesizer | null>(null);
  const storedLatentVectors = useRef<Map<string, LatentVector>>(new Map());

  // Initialize synthesizer
  useEffect(() => {
    synthesizerRef.current = new NeuralAudioSynthesizer();
  }, []);

  // Update processing state
  const updateProgress = useCallback((operation: Partial<SynthesisOperation>) => {
    setCurrentOperation(prev => prev ? { ...prev, ...operation } : null);
    setState(prev => ({ ...prev, progress: operation.progress || prev.progress }));
  }, []);

  // Encode audio to latent space
  const encodeAudio = useCallback(async (audioFile: File, params: SynthesisParams): Promise<LatentVector | null> => {
    if (!synthesizerRef.current) return null;

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    setCurrentOperation({
      type: 'encode',
      progress: 0,
      message: 'Analyzing audio structure...'
    });

    try {
      // Load audio file
      updateProgress({ progress: 20, message: 'Loading audio data...' });
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      updateProgress({ progress: 50, message: 'Extracting audio features...' });
      
      // Simulate processing time for neural encoding
      await new Promise(resolve => setTimeout(resolve, 800));

      updateProgress({ progress: 80, message: 'Encoding to latent space...' });
      const latentVector = await synthesizerRef.current.encodeToLatent(audioBuffer, params);

      updateProgress({ progress: 100, message: 'Encoding complete!' });
      
      // Store the latent vector
      const vectorId = `encoded_${Date.now()}`;
      storedLatentVectors.current.set(vectorId, latentVector);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentLatent: latentVector,
        progress: 100
      }));

      setCurrentOperation(null);
      return latentVector;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to encode audio';
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

  // Generate random audio
  const generateRandomAudio = useCallback(async (params: SynthesisParams, duration: number = 3.0): Promise<string | null> => {
    if (!synthesizerRef.current) return null;

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    setCurrentOperation({
      type: 'generate',
      progress: 0,
      message: 'Sampling latent space...'
    });

    try {
      updateProgress({ progress: 20, message: 'Generating random latent vector...' });
      const randomLatent = synthesizerRef.current.generateRandomLatent(params.latentDim);

      updateProgress({ progress: 40, message: 'Initializing neural decoder...' });
      await new Promise(resolve => setTimeout(resolve, 500));

      updateProgress({ progress: 60, message: 'Synthesizing audio...' });
      const audioBuffer = await synthesizerRef.current.decodeFromLatent(randomLatent, params, duration);

      updateProgress({ progress: 85, message: 'Rendering audio...' });
      const audioURL = await synthesizerRef.current.createAudioURL(audioBuffer);

      updateProgress({ progress: 100, message: 'Generation complete!' });

      // Store the latent vector for potential reuse
      const vectorId = `generated_${Date.now()}`;
      storedLatentVectors.current.set(vectorId, randomLatent);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentLatent: randomLatent,
        generatedAudio: audioURL,
        progress: 100
      }));

      setCurrentOperation(null);
      return audioURL;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio';
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

  // Reconstruct audio from encoded latent
  const reconstructAudio = useCallback(async (audioFile: File, params: SynthesisParams): Promise<string | null> => {
    if (!synthesizerRef.current) return null;

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    setCurrentOperation({
      type: 'decode',
      progress: 0,
      message: 'Preparing reconstruction...'
    });

    try {
      // First encode the audio
      updateProgress({ progress: 10, message: 'Encoding original audio...' });
      const latentVector = await encodeAudio(audioFile, params);
      
      if (!latentVector) {
        throw new Error('Failed to encode audio');
      }

      updateProgress({ progress: 50, message: 'Reconstructing from latent space...' });
      await new Promise(resolve => setTimeout(resolve, 600));

      updateProgress({ progress: 75, message: 'Decoding to audio...' });
      const audioBuffer = await synthesizerRef.current.decodeFromLatent(latentVector, params, 3.0);

      updateProgress({ progress: 90, message: 'Finalizing reconstruction...' });
      const audioURL = await synthesizerRef.current.createAudioURL(audioBuffer);

      updateProgress({ progress: 100, message: 'Reconstruction complete!' });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        generatedAudio: audioURL,
        progress: 100
      }));

      setCurrentOperation(null);
      return audioURL;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reconstruct audio';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        progress: 0
      }));
      setCurrentOperation(null);
      return null;
    }
  }, [encodeAudio, updateProgress]);

  // Create variations of current latent
  const createVariations = useCallback(async (
    baseLatent: LatentVector | null, 
    params: SynthesisParams, 
    variationStrength: number = 0.3,
    count: number = 1
  ): Promise<string[]> => {
    if (!synthesizerRef.current || !baseLatent) return [];

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    setCurrentOperation({
      type: 'variation',
      progress: 0,
      message: 'Creating variations...'
    });

    try {
      updateProgress({ progress: 20, message: 'Generating variation vectors...' });
      const variations = synthesizerRef.current.createVariations(baseLatent, variationStrength, count);

      const audioURLs: string[] = [];

      for (let i = 0; i < variations.length; i++) {
        const progress = 20 + (i / variations.length) * 60;
        updateProgress({ 
          progress, 
          message: `Synthesizing variation ${i + 1}/${count}...` 
        });

        const audioBuffer = await synthesizerRef.current.decodeFromLatent(
          variations[i], 
          params, 
          2.5
        );
        const audioURL = await synthesizerRef.current.createAudioURL(audioBuffer);
        audioURLs.push(audioURL);

        // Store variation
        const vectorId = `variation_${Date.now()}_${i}`;
        storedLatentVectors.current.set(vectorId, variations[i]);
      }

      updateProgress({ progress: 100, message: 'Variations complete!' });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100
      }));

      setCurrentOperation(null);
      return audioURLs;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create variations';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        progress: 0
      }));
      setCurrentOperation(null);
      return [];
    }
  }, [updateProgress]);

  // Interpolate between two latent vectors
  const interpolateAudio = useCallback(async (
    latent1: LatentVector,
    latent2: LatentVector,
    params: SynthesisParams,
    steps: number = 5
  ): Promise<string[]> => {
    if (!synthesizerRef.current) return [];

    setState(prev => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    setCurrentOperation({
      type: 'interpolate',
      progress: 0,
      message: 'Preparing interpolation...'
    });

    try {
      const audioURLs: string[] = [];

      for (let i = 0; i < steps; i++) {
        const factor = i / (steps - 1);
        const progress = (i / steps) * 90;
        
        updateProgress({ 
          progress, 
          message: `Interpolating step ${i + 1}/${steps}...` 
        });

        const interpolatedLatent = synthesizerRef.current.interpolateLatent(latent1, latent2, factor);
        const audioBuffer = await synthesizerRef.current.decodeFromLatent(
          interpolatedLatent, 
          params, 
          2.0
        );
        const audioURL = await synthesizerRef.current.createAudioURL(audioBuffer);
        audioURLs.push(audioURL);

        // Store interpolated vector
        const vectorId = `interpolated_${Date.now()}_${i}`;
        storedLatentVectors.current.set(vectorId, interpolatedLatent);
      }

      updateProgress({ progress: 100, message: 'Interpolation complete!' });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100
      }));

      setCurrentOperation(null);
      return audioURLs;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to interpolate audio';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        progress: 0
      }));
      setCurrentOperation(null);
      return [];
    }
  }, [updateProgress]);

  // Clear generated audio and reset state
  const clearAudio = useCallback(() => {
    if (state.generatedAudio) {
      URL.revokeObjectURL(state.generatedAudio);
    }
    setState(prev => ({
      ...prev,
      generatedAudio: null,
      progress: 0,
      error: null
    }));
  }, [state.generatedAudio]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get stored latent vectors
  const getStoredLatents = useCallback((): Array<{ id: string; latent: LatentVector }> => {
    return Array.from(storedLatentVectors.current.entries()).map(([id, latent]) => ({
      id,
      latent
    }));
  }, []);

  return {
    state,
    currentOperation,
    encodeAudio,
    generateRandomAudio,
    reconstructAudio,
    createVariations,
    interpolateAudio,
    clearAudio,
    clearError,
    getStoredLatents
  };
};

export default useNeuralSynthesis;