// Audio Mixing utilities for RAVE-style audio processing
export interface AudioTrack {
  id: string;
  file: File;
  buffer: AudioBuffer;
  url: string;
  name: string;
  duration: number;
  sampleRate: number;
}

export interface MixingParams {
  crossfadeTime: number;
  tempo: number;
  volume1: number;
  volume2: number;
  bassBoost: number;
  trebleBoost: number;
  reverbLevel: number;
  compressionRatio: number;
}

export interface BeatDetectionResult {
  bpm: number;
  beats: number[];
  tempo: number;
  confidence: number;
}

export class AudioMixer {
  private audioContext: AudioContext;
  private sampleRate: number;
  
  constructor(sampleRate: number = 44100) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.sampleRate = sampleRate;
  }

  // Load audio file and create AudioTrack
  async loadAudioTrack(file: File): Promise<AudioTrack> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const url = URL.createObjectURL(file);
    
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      file,
      buffer: audioBuffer,
      url,
      name: file.name,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate
    };
  }

  // Detect beats and tempo using autocorrelation and peak detection
  detectBeats(audioBuffer: AudioBuffer): BeatDetectionResult {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Apply high-pass filter to focus on percussive elements
    const filtered = this.highPassFilter(channelData, 100, sampleRate);
    
    // Calculate onset strength
    const onsetStrength = this.calculateOnsetStrength(filtered, sampleRate);
    
    // Find peaks (potential beats)
    const peaks = this.findPeaks(onsetStrength, 0.3);
    
    // Estimate BPM from peak intervals
    const bpm = this.estimateBPM(peaks, sampleRate);
    
    // Convert peak indices to time positions
    const beats = peaks.map(peak => (peak / sampleRate) * (onsetStrength.length / filtered.length));
    
    return {
      bpm,
      beats,
      tempo: bpm / 60, // beats per second
      confidence: Math.min(peaks.length / 100, 1.0) // Simple confidence metric
    };
  }

  // Create a mashup of two audio tracks
  async createMashup(
    track1: AudioTrack, 
    track2: AudioTrack, 
    params: MixingParams
  ): Promise<AudioBuffer> {
    // Detect beats for both tracks
    const beats1 = this.detectBeats(track1.buffer);
    const beats2 = this.detectBeats(track2.buffer);
    
    // Time-stretch tracks to match tempo if needed
    const adjustedTrack1 = await this.timeStretch(track1.buffer, params.tempo / beats1.tempo);
    const adjustedTrack2 = await this.timeStretch(track2.buffer, params.tempo / beats2.tempo);
    
    // Determine output length (take the longer track + crossfade)
    const outputLength = Math.max(adjustedTrack1.length, adjustedTrack2.length) + 
                        Math.floor(params.crossfadeTime * this.sampleRate);
    
    // Create output buffer
    const outputBuffer = this.audioContext.createBuffer(2, outputLength, this.sampleRate);
    const leftChannel = outputBuffer.getChannelData(0);
    const rightChannel = outputBuffer.getChannelData(1);
    
    // Process and mix the tracks
    this.mixTracks(
      adjustedTrack1, 
      adjustedTrack2, 
      leftChannel, 
      rightChannel, 
      params
    );
    
    // Apply audio effects
    this.applyEffects(outputBuffer, params);
    
    return outputBuffer;
  }

  // Mix two audio buffers with crossfading and effects
  private mixTracks(
    buffer1: AudioBuffer,
    buffer2: AudioBuffer,
    leftOut: Float32Array,
    rightOut: Float32Array,
    params: MixingParams
  ): void {
    const crossfadeSamples = Math.floor(params.crossfadeTime * this.sampleRate);
    const track1Data = buffer1.getChannelData(0);
    const track2Data = buffer2.getChannelData(0);
    
    // Calculate mixing positions
    const track1Start = 0;
    const track2Start = Math.floor(buffer1.length * 0.3); // Start track 2 at 30% through track 1
    const crossfadeStart = track2Start - crossfadeSamples / 2;
    const crossfadeEnd = track2Start + crossfadeSamples / 2;
    
    for (let i = 0; i < leftOut.length; i++) {
      let sample1 = 0;
      let sample2 = 0;
      let gain1 = params.volume1;
      let gain2 = params.volume2;
      
      // Get samples from track 1
      if (i >= track1Start && i - track1Start < track1Data.length) {
        sample1 = track1Data[i - track1Start];
      }
      
      // Get samples from track 2
      if (i >= track2Start && i - track2Start < track2Data.length) {
        sample2 = track2Data[i - track2Start];
      }
      
      // Apply crossfade
      if (i >= crossfadeStart && i <= crossfadeEnd) {
        const fadePosition = (i - crossfadeStart) / crossfadeSamples;
        const fadeFactor = this.smoothStep(fadePosition);
        gain1 *= (1 - fadeFactor);
        gain2 *= fadeFactor;
      }
      
      // Mix the samples
      const mixedSample = (sample1 * gain1) + (sample2 * gain2);
      
      // Pan slightly for stereo effect
      leftOut[i] = mixedSample * 0.7 + sample1 * gain1 * 0.3;
      rightOut[i] = mixedSample * 0.7 + sample2 * gain2 * 0.3;
    }
  }

  // Apply audio effects to the mixed output
  private applyEffects(buffer: AudioBuffer, params: MixingParams): void {
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);
    
    // Apply EQ (bass and treble boost)
    this.applyEQ(leftChannel, params.bassBoost, params.trebleBoost);
    this.applyEQ(rightChannel, params.bassBoost, params.trebleBoost);
    
    // Apply dynamic range compression
    this.applyCompression(leftChannel, params.compressionRatio);
    this.applyCompression(rightChannel, params.compressionRatio);
    
    // Apply reverb
    if (params.reverbLevel > 0) {
      this.applyReverb(leftChannel, params.reverbLevel);
      this.applyReverb(rightChannel, params.reverbLevel);
    }
    
    // Normalize to prevent clipping
    this.normalize(leftChannel);
    this.normalize(rightChannel);
  }

  // Time-stretch audio using phase vocoder technique (simplified)
  private async timeStretch(buffer: AudioBuffer, stretchFactor: number): Promise<AudioBuffer> {
    if (Math.abs(stretchFactor - 1.0) < 0.05) {
      return buffer; // No significant stretch needed
    }
    
    const inputData = buffer.getChannelData(0);
    const outputLength = Math.floor(inputData.length / stretchFactor);
    const outputBuffer = this.audioContext.createBuffer(
      buffer.numberOfChannels, 
      outputLength, 
      buffer.sampleRate
    );
    
    const outputData = outputBuffer.getChannelData(0);
    const hopSize = 512;
    const windowSize = 2048;
    
    // Simple granular synthesis approach
    for (let i = 0; i < outputLength - windowSize; i += hopSize) {
      const sourcePos = i * stretchFactor;
      const sourceIndex = Math.floor(sourcePos);
      
      if (sourceIndex + windowSize < inputData.length) {
        // Apply windowing and overlap-add
        for (let j = 0; j < windowSize; j++) {
          const window = 0.5 * (1 - Math.cos(2 * Math.PI * j / windowSize)); // Hann window
          const sample = inputData[sourceIndex + j] * window;
          
          if (i + j < outputLength) {
            outputData[i + j] += sample * 0.5; // Overlap-add with scaling
          }
        }
      }
    }
    
    return outputBuffer;
  }

  // High-pass filter for beat detection
  private highPassFilter(data: Float32Array, cutoffFreq: number, sampleRate: number): Float32Array {
    const filtered = new Float32Array(data.length);
    const rc = 1.0 / (cutoffFreq * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alpha = rc / (rc + dt);
    
    filtered[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] + data[i] - data[i - 1]);
    }
    
    return filtered;
  }

  // Calculate onset strength for beat detection
  private calculateOnsetStrength(data: Float32Array, sampleRate: number): Float32Array {
    const hopSize = 512;
    const numFrames = Math.floor(data.length / hopSize);
    const onsetStrength = new Float32Array(numFrames);
    
    for (let frame = 1; frame < numFrames; frame++) {
      let sum = 0;
      const startIndex = frame * hopSize;
      const prevStartIndex = (frame - 1) * hopSize;
      
      for (let i = 0; i < hopSize && startIndex + i < data.length; i++) {
        const current = Math.abs(data[startIndex + i]);
        const previous = Math.abs(data[prevStartIndex + i]);
        const diff = Math.max(0, current - previous); // Only positive differences
        sum += diff * diff;
      }
      
      onsetStrength[frame] = Math.sqrt(sum / hopSize);
    }
    
    return onsetStrength;
  }

  // Find peaks in onset strength
  private findPeaks(data: Float32Array, threshold: number): number[] {
    const peaks: number[] = [];
    const minDistance = 10; // Minimum samples between peaks
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > threshold && 
          data[i] > data[i - 1] && 
          data[i] > data[i + 1]) {
        
        // Check minimum distance from last peak
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
          peaks.push(i);
        }
      }
    }
    
    return peaks;
  }

  // Estimate BPM from peak intervals
  private estimateBPM(peaks: number[], sampleRate: number): number {
    if (peaks.length < 2) return 120; // Default BPM
    
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    // Find most common interval (mode)
    const intervalCounts = new Map<number, number>();
    intervals.forEach(interval => {
      const rounded = Math.round(interval / 10) * 10; // Round to nearest 10
      intervalCounts.set(rounded, (intervalCounts.get(rounded) || 0) + 1);
    });
    
    let mostCommonInterval = 0;
    let maxCount = 0;
    intervalCounts.forEach((count, interval) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonInterval = interval;
      }
    });
    
    if (mostCommonInterval === 0) return 120;
    
    // Convert to BPM
    const hopSize = 512;
    const secondsPerInterval = (mostCommonInterval * hopSize) / sampleRate;
    const bpm = 60 / secondsPerInterval;
    
    // Clamp to reasonable range
    return Math.max(60, Math.min(200, bpm));
  }

  // Smooth step function for crossfading
  private smoothStep(t: number): number {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  // Simple EQ (bass and treble boost)
  private applyEQ(data: Float32Array, bassBoost: number, trebleBoost: number): void {
    // Simple shelving filters
    const bassGain = 1 + bassBoost;
    const trebleGain = 1 + trebleBoost;
    
    // Low-pass for bass (simplified)
    let bassAccum = 0;
    const bassAlpha = 0.01;
    
    // High-pass for treble (simplified)
    let trebleAccum = 0;
    const trebleAlpha = 0.99;
    
    for (let i = 0; i < data.length; i++) {
      // Bass component
      bassAccum = bassAccum + bassAlpha * (data[i] - bassAccum);
      
      // Treble component
      trebleAccum = trebleAccum + trebleAlpha * (data[i] - trebleAccum);
      const treble = data[i] - trebleAccum;
      
      // Mix with boosts
      data[i] = bassAccum * bassGain + treble * trebleGain + data[i] * 0.5;
    }
  }

  // Dynamic range compression
  private applyCompression(data: Float32Array, ratio: number): void {
    const threshold = 0.7;
    const makeupGain = 1.2;
    
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > threshold) {
        const excess = abs - threshold;
        const compressedExcess = excess / ratio;
        const newAbs = threshold + compressedExcess;
        data[i] = (data[i] / abs) * newAbs * makeupGain;
      } else {
        data[i] *= makeupGain;
      }
    }
  }

  // Simple reverb using delay lines
  private applyReverb(data: Float32Array, level: number): void {
    const delayTimes = [0.03, 0.05, 0.07, 0.09]; // Multiple delay times for reverb
    const feedback = 0.3;
    const wetGain = level * 0.3;
    const dryGain = 1 - wetGain;
    
    const processed = new Float32Array(data.length);
    
    delayTimes.forEach(delayTime => {
      const delaySamples = Math.floor(delayTime * this.sampleRate);
      const delayBuffer = new Float32Array(delaySamples);
      let delayIndex = 0;
      
      for (let i = 0; i < data.length; i++) {
        const delayed = delayBuffer[delayIndex];
        delayBuffer[delayIndex] = data[i] + delayed * feedback;
        processed[i] += delayed * wetGain / delayTimes.length;
        
        delayIndex = (delayIndex + 1) % delaySamples;
      }
    });
    
    // Mix dry and wet signals
    for (let i = 0; i < data.length; i++) {
      data[i] = data[i] * dryGain + processed[i];
    }
  }

  // Normalize audio to prevent clipping
  private normalize(data: Float32Array): void {
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      max = Math.max(max, Math.abs(data[i]));
    }
    
    if (max > 1.0) {
      const scale = 0.95 / max; // Leave some headroom
      for (let i = 0; i < data.length; i++) {
        data[i] *= scale;
      }
    }
  }

  // Create audio URL from buffer for playback
  async createAudioURL(audioBuffer: AudioBuffer): Promise<string> {
    // Convert to WAV blob
    const wavBlob = this.audioBufferToWav(audioBuffer);
    return URL.createObjectURL(wavBlob);
  }

  // Convert AudioBuffer to WAV blob
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

export default AudioMixer;