// AudioWorkletProcessor that downsamples to a target sample rate and outputs 16-bit PCM
class PCMWorkletProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options?.processorOptions || {};
    this.targetSampleRate = processorOptions.targetSampleRate || 16000;
    this.chunkLength = processorOptions.chunkLength || 4096;
    this.sourceSampleRate = sampleRate;
    this.buffer = [];
    this.sourceFramesPerChunk = Math.round(
      this.chunkLength * (this.sourceSampleRate / this.targetSampleRate)
    );
  }

  process(inputs, outputs) {
    const channels = inputs[0];
    const output = outputs[0];

    if (!channels || channels.length === 0) {
      if (output && output[0]) output[0].fill(0);
      return true;
    }

    // Downmix all available channels to mono
    const sampleFrames = channels[0].length;
    for (let frame = 0; frame < sampleFrames; frame++) {
      let sum = 0;
      for (let c = 0; c < channels.length; c++) {
        sum += channels[c][frame] || 0;
      }
      const mono = sum / channels.length;
      this.buffer.push(mono);
      if (output && output[0]) {
        output[0][frame] = mono; // optional passthrough (muted upstream)
      }
    }

    while (this.buffer.length >= this.sourceFramesPerChunk) {
      const block = this.buffer.slice(0, this.sourceFramesPerChunk);
      this.buffer = this.buffer.slice(this.sourceFramesPerChunk);

      const downsampled = this.downsample(block, this.sourceSampleRate, this.targetSampleRate);
      const { rms, peak } = this.measureLevels(downsampled);
      const pcm16 = this.toInt16(downsampled);

      this.port.postMessage(
        {
          type: 'chunk',
          pcm: pcm16.buffer,
          rms,
          peak,
        },
        [pcm16.buffer]
      );
    }

    return true;
  }

  downsample(input, sourceRate, targetRate) {
    if (sourceRate === targetRate) {
      return new Float32Array(input);
    }

    const ratio = sourceRate / targetRate;
    const newLength = Math.round(input.length / ratio);
    const output = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(Math.floor((i + 1) * ratio), input.length);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += input[j];
      }
      output[i] = sum / Math.max(1, end - start);
    }

    return output;
  }

  toInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  measureLevels(data) {
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      sumSquares += v * v;
      const abs = v < 0 ? -v : v;
      if (abs > peak) {
        peak = abs;
      }
    }
    const rms = Math.sqrt(sumSquares / data.length);
    return { rms, peak };
  }
}

registerProcessor('pcm-worklet', PCMWorkletProcessor);
