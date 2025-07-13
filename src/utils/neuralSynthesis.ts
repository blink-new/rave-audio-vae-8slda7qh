// Neural Audio Synthesis utilities for RAVE-style VAE
export interface LatentVector {
  dimensions: number;
  data: Float32Array;
}

export interface SynthesisParams {
  latentDim: number;
  temperature: number;
  interpolation: number;
  noiseLevel: number;
  compressionRatio: number;
}

export interface AudioFeatures {
  mfcc: number[];
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  rms: number;
  pitch: number;
  brightness: number;
}

export class NeuralAudioSynthesizer {
  private audioContext: AudioContext;
  private sampleRate: number;
  
  constructor(sampleRate: number = 44100) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.sampleRate = sampleRate;
  }

  // Encode audio to latent space representation
  async encodeToLatent(audioBuffer: AudioBuffer, params: SynthesisParams): Promise<LatentVector> {
    const features = this.extractAudioFeatures(audioBuffer);
    
    // Simulate VAE encoding by mapping audio features to latent dimensions
    const latentData = new Float32Array(params.latentDim);
    
    // Use audio features to create meaningful latent representation
    for (let i = 0; i < params.latentDim; i++) {
      const featureIndex = i % features.mfcc.length;
      const baseValue = features.mfcc[featureIndex];
      
      // Add some non-linearity and feature mixing
      const spectralInfluence = Math.sin(features.spectralCentroid / 1000 * i * 0.01);
      const rhythmInfluence = Math.cos(features.zeroCrossingRate * i * 0.1);
      const timbralInfluence = features.brightness * Math.sin(i * 0.05);
      
      latentData[i] = baseValue + 
                     spectralInfluence * 0.3 + 
                     rhythmInfluence * 0.2 + 
                     timbralInfluence * 0.1;
      
      // Apply compression based on compression ratio
      latentData[i] = Math.tanh(latentData[i] / params.compressionRatio);
    }
    
    return {
      dimensions: params.latentDim,
      data: latentData
    };
  }

  // Decode latent vector back to audio
  async decodeFromLatent(latentVector: LatentVector, params: SynthesisParams, duration: number = 2.0): Promise<AudioBuffer> {
    const length = Math.floor(this.sampleRate * duration);
    const audioBuffer = this.audioContext.createBuffer(1, length, this.sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Generate harmonics based on latent dimensions
    const numHarmonics = Math.min(32, Math.floor(latentVector.dimensions / 4));
    const fundamentalFreq = this.mapLatentToFrequency(latentVector.data[0]);
    
    for (let i = 0; i < length; i++) {
      const t = i / this.sampleRate;
      let sample = 0;
      
      // Generate harmonic series from latent space
      for (let h = 0; h < numHarmonics; h++) {
        const latentIndex = h % latentVector.dimensions;
        const harmonic = h + 1;
        const frequency = fundamentalFreq * harmonic;
        
        // Use latent values to control amplitude and phase
        const amplitude = Math.abs(latentVector.data[latentIndex]) * 
                         Math.exp(-harmonic / 8) * // Natural harmonic decay
                         (1 / Math.sqrt(harmonic)); // Additional rolloff
        
        const phase = latentVector.data[(latentIndex + 1) % latentVector.dimensions] * Math.PI;
        const modulation = 1 + 0.1 * Math.sin(t * 2 * Math.PI * 0.5); // Subtle modulation
        
        sample += amplitude * Math.sin(2 * Math.PI * frequency * t + phase) * modulation;
      }
      
      // Apply spectral shaping based on latent space
      const spectralShape = this.getSpectralEnvelope(t, duration, latentVector, params);
      sample *= spectralShape;
      
      // Add controlled noise based on noise level parameter
      const noise = (Math.random() - 0.5) * params.noiseLevel * 0.1;
      sample += noise;
      
      // Apply temperature-based softening
      sample = Math.tanh(sample * params.temperature);
      
      channelData[i] = sample * 0.3; // Scale to prevent clipping
    }
    
    // Apply post-processing filters
    this.applyPostProcessing(channelData, latentVector, params);
    
    return audioBuffer;
  }

  // Generate random latent vector
  generateRandomLatent(dimensions: number): LatentVector {
    const data = new Float32Array(dimensions);
    
    for (let i = 0; i < dimensions; i++) {
      // Use normal distribution for more realistic latent space
      data[i] = this.randomNormal() * 0.5;
    }
    
    return { dimensions, data };
  }

  // Interpolate between two latent vectors
  interpolateLatent(latent1: LatentVector, latent2: LatentVector, factor: number): LatentVector {
    if (latent1.dimensions !== latent2.dimensions) {
      throw new Error('Latent vectors must have the same dimensions');
    }
    
    const data = new Float32Array(latent1.dimensions);
    
    for (let i = 0; i < latent1.dimensions; i++) {
      data[i] = latent1.data[i] * (1 - factor) + latent2.data[i] * factor;
    }
    
    return { dimensions: latent1.dimensions, data };
  }

  // Create variations of a latent vector
  createVariations(baseLatent: LatentVector, variationStrength: number, count: number): LatentVector[] {
    const variations: LatentVector[] = [];
    
    for (let v = 0; v < count; v++) {
      const data = new Float32Array(baseLatent.dimensions);
      
      for (let i = 0; i < baseLatent.dimensions; i++) {
        const noise = this.randomNormal() * variationStrength;
        data[i] = baseLatent.data[i] + noise;
      }
      
      variations.push({ dimensions: baseLatent.dimensions, data });
    }
    
    return variations;
  }

  // Extract meaningful audio features for encoding
  private extractAudioFeatures(audioBuffer: AudioBuffer): AudioFeatures {
    const channelData = audioBuffer.getChannelData(0);
    const length = channelData.length;
    
    // MFCC approximation
    const mfcc = this.computeMFCC(channelData);
    
    // Spectral features
    const spectrum = this.computeSpectrum(channelData);
    const spectralCentroid = this.computeSpectralCentroid(spectrum);
    const spectralRolloff = this.computeSpectralRolloff(spectrum);
    
    // Temporal features
    const zeroCrossingRate = this.computeZeroCrossingRate(channelData);
    const rms = this.computeRMS(channelData);
    
    // High-level features
    const pitch = this.estimatePitch(channelData);
    const brightness = spectralCentroid / (this.sampleRate / 2); // Normalized brightness
    
    return {
      mfcc,
      spectralCentroid,
      spectralRolloff,
      zeroCrossingRate,
      rms,
      pitch,
      brightness
    };
  }

  private computeMFCC(data: Float32Array): number[] {
    // Simplified MFCC computation
    const mfcc: number[] = [];
    const numCoeffs = 13;
    
    const spectrum = this.computeSpectrum(data);
    const melFilters = this.createMelFilterBank(spectrum.length);
    
    for (let i = 0; i < numCoeffs; i++) {
      let coeff = 0;
      for (let j = 0; j < melFilters.length; j++) {
        coeff += Math.log(Math.max(1e-10, spectrum[j] * melFilters[j])) * 
                Math.cos(i * (j + 0.5) * Math.PI / melFilters.length);
      }
      mfcc.push(coeff);
    }
    
    return mfcc;
  }

  private computeSpectrum(data: Float32Array): Float32Array {
    const fftSize = Math.min(2048, Math.pow(2, Math.floor(Math.log2(data.length))));
    const spectrum = new Float32Array(fftSize / 2);
    
    // Simple FFT approximation using DFT
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0, imag = 0;
      
      for (let n = 0; n < Math.min(fftSize, data.length); n++) {
        const angle = -2 * Math.PI * k * n / fftSize;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  private createMelFilterBank(size: number): Float32Array {
    const melFilters = new Float32Array(size);
    const melMax = 2595 * Math.log10(1 + (this.sampleRate / 2) / 700);
    
    for (let i = 0; i < size; i++) {
      const mel = (i / size) * melMax;
      const freq = 700 * (Math.pow(10, mel / 2595) - 1);
      melFilters[i] = Math.exp(-Math.pow((freq - 1000) / 800, 2)); // Gaussian filter
    }
    
    return melFilters;
  }

  private computeSpectralCentroid(spectrum: Float32Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 1; i < spectrum.length; i++) {
      const frequency = (i / spectrum.length) * (this.sampleRate / 2);
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private computeSpectralRolloff(spectrum: Float32Array): number {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val, 0);
    const rolloffThreshold = 0.85 * totalEnergy;
    
    let energySum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      energySum += spectrum[i];
      if (energySum >= rolloffThreshold) {
        return (i / spectrum.length) * (this.sampleRate / 2);
      }
    }
    
    return this.sampleRate / 2;
  }

  private computeZeroCrossingRate(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (data.length - 1);
  }

  private computeRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private estimatePitch(data: Float32Array): number {
    // Simple autocorrelation-based pitch estimation
    const minPeriod = Math.floor(this.sampleRate / 800); // 800 Hz max
    const maxPeriod = Math.floor(this.sampleRate / 80);  // 80 Hz min
    
    let bestCorrelation = 0;
    let bestPeriod = minPeriod;
    
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < data.length - period; i++) {
        correlation += data[i] * data[i + period];
        count++;
      }
      
      correlation /= count;
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    return this.sampleRate / bestPeriod;
  }

  private mapLatentToFrequency(latentValue: number): number {
    // Map latent value to musical frequency range (80-800 Hz)
    const normalized = (Math.tanh(latentValue) + 1) / 2; // Normalize to 0-1
    return 80 + normalized * 720; // 80-800 Hz range
  }

  private getSpectralEnvelope(t: number, duration: number, latentVector: LatentVector, params: SynthesisParams): number {
    // Create spectral envelope based on latent dimensions
    const progress = t / duration;
    const envelopeIndex = Math.floor(progress * latentVector.dimensions) % latentVector.dimensions;
    const envelopeValue = latentVector.data[envelopeIndex];
    
    // ADSR-like envelope with latent modulation
    let envelope = 1.0;
    
    if (progress < 0.1) {
      envelope = progress / 0.1; // Attack
    } else if (progress > 0.8) {
      envelope = (1.0 - progress) / 0.2; // Release
    }
    
    // Modulate with latent value
    envelope *= (0.5 + 0.5 * Math.tanh(envelopeValue));
    
    return Math.max(0, Math.min(1, envelope));
  }

  private applyPostProcessing(channelData: Float32Array, latentVector: LatentVector, params: SynthesisParams): void {
    // Apply simple low-pass filtering based on latent space
    const cutoffIndex = Math.floor(latentVector.dimensions / 3);
    const cutoffModulation = Math.abs(latentVector.data[cutoffIndex]);
    
    // Simple moving average filter
    const filterSize = Math.floor(3 + cutoffModulation * 7);
    const filtered = new Float32Array(channelData.length);
    
    for (let i = 0; i < channelData.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - filterSize); j <= Math.min(channelData.length - 1, i + filterSize); j++) {
        sum += channelData[j];
        count++;
      }
      
      filtered[i] = sum / count;
    }
    
    // Copy filtered data back
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = filtered[i];
    }
  }

  private randomNormal(): number {
    // Box-Muller transform for normal distribution
    const u = Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Create audio URL from buffer for playback
  async createAudioURL(audioBuffer: AudioBuffer): Promise<string> {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV blob
    const wavBlob = this.audioBufferToWav(renderedBuffer);
    return URL.createObjectURL(wavBlob);
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

export default NeuralAudioSynthesizer;