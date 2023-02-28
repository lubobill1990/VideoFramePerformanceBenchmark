import { makeAutoObservable } from 'mobx';

export class AppStore {
  cameraWidth = 1280;
  cameraHeight = 720;
  copyX = 0;
  copyY = 0;
  copyWidth = 2;
  copyHeight = 2;
  inputVideoTrack: MediaStreamVideoTrack | null = null;
  videoFrameProsessTimeList = [0];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setCopyX(x: number) {
    this.copyX = Math.min(Math.max(x, 0), this.cameraWidth - this.copyWidth);
  }

  setCopyY(y: number) {
    this.copyY = Math.min(Math.max(y, 0), this.cameraHeight - this.copyHeight);
  }

  setCopyWidth(width: number) {
    this.copyWidth =
      Math.round(
        Math.min(Math.max(width, 2), this.cameraWidth - this.copyX) / 2
      ) * 2;
  }

  setCopyHeight(height: number) {
    this.copyHeight =
      Math.round(
        Math.min(Math.max(height, 2), this.cameraHeight - this.copyY) / 2
      ) * 2;
  }

  setInputVideoTrack(track: MediaStreamVideoTrack | null) {
    this.inputVideoTrack = track;
  }

  public get copiedBufferSize() {
    return Math.ceil(this.copyWidth * this.copyHeight * 1.5);
  }
  private get arrayBuffer() {
    return new ArrayBuffer(this.copiedBufferSize);
  }

  private getCurrentTimestampInMilliseconds() {
    // return Date.now();
    return performance.now();
  }

  private get transform() {
    const visibleRect = {
      x: this.copyX,
      y: this.copyY,
      width: this.copyWidth,
      height: this.copyHeight,
    };

    return async (videoFrame: any, controller: any) => {
      const start = this.getCurrentTimestampInMilliseconds();

      const newFrame = new VideoFrame(videoFrame, {
        timestamp: videoFrame.timestamp,
        duration: videoFrame.duration,
        visibleRect,
      });
      await newFrame.copyTo(this.arrayBuffer);
      const end = this.getCurrentTimestampInMilliseconds();
      this.pushVideoFrameProcessTime(end - start);

      videoFrame.close();
      controller.enqueue(newFrame);
    };
  }

  private get transformer() {
    return new TransformStream({
      transform: this.transform,
    });
  }

  get processingGenerator() {
    const processor =
      this.inputVideoTrack &&
      new MediaStreamTrackProcessor({ track: this.inputVideoTrack });
    const generator = new MediaStreamTrackGenerator({ kind: 'video' });
    const transformer = this.transformer;

    if (!processor) {
      return null;
    }
    try {
      processor.readable.pipeThrough(transformer).pipeTo(generator.writable);
      return generator;
    } catch (e) {
      return null;
    }
  }

  pushVideoFrameProcessTime(time: number) {
    this.videoFrameProsessTimeList.push(time);
    if (this.videoFrameProsessTimeList.length > 100) {
      this.videoFrameProsessTimeList.shift();
    }
  }

  get videoFrameProcessingTime() {
    if (this.videoFrameProsessTimeList.length === 0) {
      return 0;
    }
    return (
      this.videoFrameProsessTimeList.reduce((a, b) => a + b, 0) /
      this.videoFrameProsessTimeList.length
    );
  }
}

const appStore = new AppStore();
export function useAppStore() {
  return appStore;
}
