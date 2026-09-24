import { MAX_RECORDING_SEGMENT_MS, type VoiceChunk } from '@/services/speechListeningApi';

export type DesktopVoiceRecorderHandlers = {
  onSegmentReady: (chunk: VoiceChunk) => void | Promise<void>;
  onError?: (error: Error) => void;
};

const pickMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
};

const extensionForMime = (mimeType: string) => {
  if (mimeType.includes('mp4')) {
    return 'm4a';
  }
  if (mimeType.includes('ogg')) {
    return 'ogg';
  }
  return 'webm';
};

export class DesktopVoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private segmentStartedAt = 0;
  private pausedAt = 0;
  private pausedTotalMs = 0;
  private rotationTimer: number | null = null;
  private mimeType = '';
  private running = false;
  private paused = false;
  private handlers: DesktopVoiceRecorderHandlers | null = null;
  private segmentIndex = 0;

  get isRunning() {
    return this.running;
  }

  get isPaused() {
    return this.paused;
  }

  async start(handlers: DesktopVoiceRecorderHandlers) {
    if (this.running) {
      return;
    }

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone recording is not supported in this environment.');
    }

    this.handlers = handlers;
    this.mimeType = pickMimeType();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });

    this.running = true;
    this.paused = false;
    this.segmentIndex = 0;
    this.beginSegment();
  }

  pause() {
    if (!this.running || this.paused || !this.recorder) {
      return;
    }

    if (this.recorder.state === 'recording') {
      this.recorder.pause();
    }
    this.paused = true;
    this.pausedAt = Date.now();
    this.clearRotationTimer();
  }

  resume() {
    if (!this.running || !this.paused || !this.recorder) {
      return;
    }

    if (this.pausedAt) {
      this.pausedTotalMs += Date.now() - this.pausedAt;
      this.pausedAt = 0;
    }

    if (this.recorder.state === 'paused') {
      this.recorder.resume();
    }
    this.paused = false;
    this.scheduleRotation();
  }

  async stop(): Promise<VoiceChunk | null> {
    if (!this.running) {
      return null;
    }

    this.running = false;
    this.paused = false;
    this.clearRotationTimer();

    const finalChunk = await this.finalizeCurrentSegment(false);
    this.cleanupStream();
    this.handlers = null;
    return finalChunk;
  }

  private beginSegment() {
    if (!this.stream || !this.running) {
      return;
    }

    this.chunks = [];
    this.segmentStartedAt = Date.now();
    this.pausedAt = 0;
    this.pausedTotalMs = 0;
    this.segmentIndex += 1;

    try {
      this.recorder = this.mimeType
        ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
        : new MediaRecorder(this.stream);
    } catch (error) {
      this.handlers?.onError?.(
        error instanceof Error ? error : new Error('Unable to start microphone recorder.'),
      );
      return;
    }

    this.mimeType = this.recorder.mimeType || this.mimeType || 'audio/webm';

    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.recorder.onerror = () => {
      this.handlers?.onError?.(new Error('Microphone recording failed.'));
    };

    this.recorder.start(1000);
    this.scheduleRotation();
  }

  private scheduleRotation() {
    this.clearRotationTimer();
    if (!this.running || this.paused) {
      return;
    }

    this.rotationTimer = window.setTimeout(() => {
      void this.rotateSegment();
    }, MAX_RECORDING_SEGMENT_MS);
  }

  private clearRotationTimer() {
    if (this.rotationTimer !== null) {
      window.clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private async rotateSegment() {
    if (!this.running || this.paused) {
      return;
    }

    const chunk = await this.finalizeCurrentSegment(true);
    if (chunk) {
      await this.handlers?.onSegmentReady(chunk);
    }

    if (this.running && !this.paused) {
      this.beginSegment();
    }
  }

  private finalizeCurrentSegment(keepAlive: boolean): Promise<VoiceChunk | null> {
    return new Promise((resolve) => {
      const activeRecorder = this.recorder;
      if (!activeRecorder || activeRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const startedAt = this.segmentStartedAt;
      const mimeType = this.mimeType || activeRecorder.mimeType || 'audio/webm';
      const index = this.segmentIndex;

      activeRecorder.onstop = () => {
        let pausedMs = this.pausedTotalMs;
        if (this.pausedAt) {
          pausedMs += Date.now() - this.pausedAt;
        }
        const durationMs = Math.max(0, Date.now() - startedAt - pausedMs);
        const blob = new Blob(this.chunks, { type: mimeType });
        this.chunks = [];
        this.recorder = null;
        this.pausedTotalMs = 0;
        this.pausedAt = 0;

        if (!blob.size || durationMs < 250) {
          resolve(null);
          return;
        }

        resolve({
          blob,
          durationMs,
          mimeType,
          fileName: `voice-message-${index}.${extensionForMime(mimeType)}`,
        });
      };

      try {
        if (activeRecorder.state === 'paused') {
          activeRecorder.resume();
        }
        activeRecorder.stop();
      } catch {
        resolve(null);
      }
    });
  }

  private cleanupStream() {
    this.clearRotationTimer();
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
  }
}
