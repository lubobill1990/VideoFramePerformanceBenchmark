import { makeAutoObservable } from 'mobx';

class TimeProfiler {
  timeList: number[] = [];
  startTime = 0;
  endTime = 0;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }
  pushTime(time: number) {
    this.timeList.push(time);
    if (this.timeList.length > 100) {
      this.timeList.shift();
    }
  }
  get averageTime() {
    if (this.timeList.length === 0) {
      return 0;
    }
    return (
      this.timeList.reduce((a, b) => a + b, 0) / this.timeList.length
    ).toFixed(4);
  }

  private getCurrentTimestampInMilliseconds() {
    // return Date.now();
    return performance.now();
  }

  start() {
    this.startTime = this.getCurrentTimestampInMilliseconds();
  }

  end() {
    this.endTime = this.getCurrentTimestampInMilliseconds();
    this.pushTime(this.endTime - this.startTime);
  }

  run(func: () => void) {
    this.start();
    func();
    this.end();
  }
}

export class CanvasElement {
  element: HTMLCanvasElement;
  constructor(
    public width: number,
    public height: number,
    private willReadFrequently = false
  ) {
    this.element = document.createElement('canvas');
    this.element.height = height;
    this.element.width = width;
  }

  get context2d() {
    if (this.willReadFrequently) {
      return this.element.getContext('2d', { willReadFrequently: false });
    }
    return this.element.getContext('2d');
  }

  get contextWebGL() {
    return this.element.getContext('webgl');
  }

  get contextWebGL2() {
    return this.element.getContext('webgl2');
  }
}

export class AppStore {
  cameraWidth = 1920;
  cameraHeight = 1080;
  copyXLocal = 0;
  copyYLocal = 0;
  copyWidthLocal = 2;
  copyHeightLocal = 2;
  inputVideoTrack: MediaStreamVideoTrack | null = null;
  constructNewVideoFrame = new TimeProfiler();
  videoFrameCopyToArrayBuffer = new TimeProfiler();
  arrayBufferToVideoFrame = new TimeProfiler();
  drawVideoFrameOnBufferToCanvas2D = new TimeProfiler();
  drawVideoFrameFromCameraToCanvas2D = new TimeProfiler();
  drawVideoFrameOnBufferToCanvasGL = new TimeProfiler();
  drawVideoFrameFromCameraToCanvasGL = new TimeProfiler();
  profilerTrameToBitmapToFrameToBuffer = new TimeProfiler();
  profilerFrameToCanvasToBuffer = new TimeProfiler();
  arrayBuffer = new ArrayBuffer(0);
  videoFrameCopyToArrayBufferRGBA = new Uint8Array(0);
  canvasGetImageDataArrayBufferRGBA = new Uint8Array(0);

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
  }

  setCameraFrameSize(width: number, height: number) {
    this.cameraWidth = width;
    this.cameraHeight = height;
  }

  get canvas2DForVideoFrameOnBuffer() {
    return new CanvasElement(this.copyWidth, this.copyHeight);
  }

  get canvas2DForVideoFrameFromCamera() {
    return new CanvasElement(this.copyWidth, this.copyHeight);
  }

  get canvas2DForResizedVideoFrameRGBA() {
    return new CanvasElement(this.copyWidth, this.copyHeight);
  }

  get canvas2DForDrawingResizedVideoFrameRGBA() {
    return new CanvasElement(this.copyWidth, this.copyHeight, true);
  }

  get canvasGLForVideoFrameOnBuffer() {
    return new CanvasElement(this.copyWidth, this.copyHeight);
  }

  get canvasGLForVideoFrameFromCamera() {
    return new CanvasElement(this.copyWidth, this.copyHeight);
  }

  public get copiedBufferSize() {
    return Math.ceil(this.copyWidth * this.copyHeight * 1.5);
  }
  public get copiedRgbaBufferSize() {
    return Math.ceil(this.copyWidth * this.copyHeight * 4);
  }
  private updateArrayBuffer() {
    this.arrayBuffer = new ArrayBuffer(this.copiedBufferSize);
  }

  private get transform() {
    const visibleRect = {
      x: this.copyX,
      y: this.copyY,
      width: this.copyWidth,
      height: this.copyHeight,
    };
    return async (videoFrame: any, controller: any) => {
      if (
        this.copiedRgbaBufferSize !==
        this.videoFrameCopyToArrayBufferRGBA.length
      ) {
        this.videoFrameCopyToArrayBufferRGBA = new Uint8Array(
          this.copiedRgbaBufferSize
        );
      }

      this.profilerFrameToCanvasToBuffer.start();
      this.canvas2DForDrawingResizedVideoFrameRGBA.context2d?.drawImage(
        videoFrame,
        0,
        0,
        this.copyWidth,
        this.copyHeight
      );
      const arrayBuffer1 =
        this.canvas2DForDrawingResizedVideoFrameRGBA.context2d?.getImageData(
          0,
          0,
          this.copyWidth,
          this.copyHeight
        ).data;
      this.profilerFrameToCanvasToBuffer.end();

      this.profilerTrameToBitmapToFrameToBuffer.start();
      const imageBitmap = await createImageBitmap(
        videoFrame,
        0,
        0,
        videoFrame.displayWidth,
        videoFrame.displayHeight,
        {
          resizeHeight: this.copyHeight,
          resizeWidth: this.copyWidth,
        }
      );
      const newVideoFrameFromBitmap = new VideoFrame(imageBitmap, {
        timestamp: videoFrame.timestamp,
        duration: videoFrame.duration,
        displayHeight: this.copyHeight,
        displayWidth: this.copyWidth,
        visibleRect,
      });
      await newVideoFrameFromBitmap.copyTo(
        this.videoFrameCopyToArrayBufferRGBA
      );
      this.profilerTrameToBitmapToFrameToBuffer.end();
      // console.log(this.videoFrameCopyToArrayBufferRGBA.subarray(0, 10));
      this.canvas2DForResizedVideoFrameRGBA.context2d?.drawImage(
        new VideoFrame(this.videoFrameCopyToArrayBufferRGBA, {
          timestamp: videoFrame.timestamp,
          duration: videoFrame.duration,
          displayHeight: this.copyHeight,
          displayWidth: this.copyWidth,
          codedHeight: this.copyHeight,
          codedWidth: this.copyWidth,
          format: 'RGBA',
        }),
        0,
        0
      );

      this.updateArrayBuffer();
      this.constructNewVideoFrame.start();
      const newFrame = new VideoFrame(videoFrame, {
        timestamp: videoFrame.timestamp,
        duration: videoFrame.duration,
        visibleRect,
      });
      this.constructNewVideoFrame.end();

      this.videoFrameCopyToArrayBuffer.start();
      await newFrame.copyTo(this.arrayBuffer);
      this.videoFrameCopyToArrayBuffer.end();

      this.arrayBufferToVideoFrame.start();
      const options = {
        format: newFrame.format!,
        timestamp: videoFrame.timestamp,
        duration: videoFrame.duration,
        codedHeight: this.copyHeight,
        codedWidth: this.copyWidth,
        displayHeight: this.copyHeight,
        displayWidth: this.copyWidth,
      };
      const newFrameFromBuffer = new VideoFrame(this.arrayBuffer, options);
      this.arrayBufferToVideoFrame.end();

      this.drawVideoFrameOnBufferToCanvas2D.run(() =>
        this.canvas2DForVideoFrameOnBuffer.context2d?.drawImage(
          newFrameFromBuffer,
          0,
          0
        )
      );

      this.drawVideoFrameFromCameraToCanvas2D.run(() =>
        this.canvas2DForVideoFrameFromCamera.context2d?.drawImage(
          newFrame,
          0,
          0
        )
      );
      newVideoFrameFromBitmap.close();
      newFrame.close();
      videoFrame.close();
      controller.enqueue(newFrameFromBuffer);
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
}

const appStore = new AppStore();
export function useAppStore() {
  return appStore;
}
