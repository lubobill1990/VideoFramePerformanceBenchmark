import { makeAutoObservable } from 'mobx';

export class AppStore {
  cameraWidth = 1920;
  cameraHeight = 1080;
  copyXLocal = 0;
  copyYLocal = 0;
  copyWidthLocal = 2;
  copyHeightLocal = 2;
  inputVideoTrack: MediaStreamVideoTrack | null = null;
  videoFrameProsessTimeList = [0];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get copyX(): number {
    return Math.min(Math.max(this.copyXLocal, 0), this.cameraWidth - 2);
  }

  get copyY(): number {
    return Math.min(Math.max(this.copyYLocal, 0), this.cameraHeight - 2);
  }

  get copyWidth(): number {
    return (
      Math.round(
        Math.min(
          Math.max(this.copyWidthLocal, 2),
          this.cameraWidth - this.copyX
        ) / 2
      ) * 2
    );
  }

  get copyHeight(): number {
    return (
      Math.round(
        Math.min(
          Math.max(this.copyHeightLocal, 2),
          this.cameraHeight - this.copyY
        ) / 2
      ) * 2
    );
  }
  setCopyX(x: number) {
    this.copyXLocal = x;
  }

  setCopyY(y: number) {
    this.copyYLocal = y;
  }

  setCopyWidth(width: number) {
    this.copyWidthLocal = width;
  }

  setCopyHeight(height: number) {
    this.copyHeightLocal = height;
  }

  setInputVideoTrack(track: MediaStreamVideoTrack | null) {
    this.inputVideoTrack = track;
    console.log('setInputVideoTrack', track);
  }

  setCameraFrameSize(width: number, height: number) {
    this.cameraWidth = width;
    this.cameraHeight = height;
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
    const arrayBuffer = this.arrayBuffer;

    return async (videoFrame: any, controller: any) => {
      const start = this.getCurrentTimestampInMilliseconds();

      const newFrame = new VideoFrame(videoFrame, {
        timestamp: videoFrame.timestamp,
        duration: videoFrame.duration,
        visibleRect,
      });
      await newFrame.copyTo(arrayBuffer);
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
