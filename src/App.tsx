import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { CanvasElement, useAppStore } from './app-store';

const MediaStreamTrackGetter = observer(() => {
  const { cameraHeight, cameraWidth, setInputVideoTrack } = useAppStore();
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: cameraWidth,
          height: cameraHeight,
          deviceId: 'd4dde0d0-9076-41a4-b30d-c23fdec4fe1e',
        },
      })
      .then((stream) => {
        const videoTrack = stream.getVideoTracks()[0];
        setInputVideoTrack(videoTrack);
      });

    return () => {
      setInputVideoTrack(null);
    };
  }, [cameraHeight, cameraWidth, setInputVideoTrack]);

  return null;
});

const Input = observer(() => {
  const {
    copyWidth,
    copyHeight,
    copyX,
    copyY,
    cameraHeight,
    cameraWidth,
    setCopyX,
    setCopyY,
    setCopyWidth,
    setCopyHeight,
  } = useAppStore();
  return (
    <div className='input-wrap'>
      <label htmlFor=''>
        X
        <input
          type='number'
          value={copyX}
          min={0}
          max={cameraWidth - 2}
          onChange={(e) => setCopyX(parseInt(e.target.value, 10))}
        />
      </label>
      <label htmlFor=''>
        Y
        <input
          type='number'
          value={copyY}
          min={0}
          max={cameraHeight - 2}
          onChange={(e) => setCopyY(parseInt(e.target.value, 10))}
        />
      </label>
      <label htmlFor=''>
        Width
        <input
          type='number'
          value={copyWidth}
          min={2}
          step={2}
          max={cameraWidth - copyX}
          onChange={(e) => setCopyWidth(parseInt(e.target.value, 10))}
        />
      </label>
      <label htmlFor=''>
        Height
        <input
          type='number'
          value={copyHeight}
          min={2}
          step={2}
          max={cameraHeight - copyY}
          onChange={(e) => setCopyHeight(parseInt(e.target.value, 10))}
        />
      </label>
    </div>
  );
});

const Statistics = observer(() => {
  const {
    videoFrameCopyToArrayBuffer: videoFrameCopyToArrayBuffer,
    arrayBufferToVideoFrame: arrayBufferToVideoFrame,
    constructNewVideoFrame: constructNewVideoFrame,
    drawVideoFrameOnBufferToCanvas2D: drawVideoFrameOnBufferToCanvas2D,
    drawVideoFrameFromCameraToCanvas2D,
    profilerTrameToBitmapToFrameToBuffer,
    copiedBufferSize,
    profilerFrameToCanvasToBuffer,
  } = useAppStore();

  return (
    <div id='statistics'>
      <table>
        <tbody>
          <tr>
            <td>Copied buffer size</td>
            <td>{copiedBufferSize}</td>
          </tr>
          <tr>
            <td>Construct new VideoFrame</td>
            <td>{constructNewVideoFrame.averageTime}</td>
          </tr>
          <tr>
            <td>Copy from VideoFrame to ArrayBuffer</td>
            <td>{videoFrameCopyToArrayBuffer.averageTime}</td>
          </tr>
          <tr>
            <td>Construct VideoFrame from ArrayBuffer</td>
            <td>{arrayBufferToVideoFrame.averageTime}</td>
          </tr>
          <tr>
            <td>Draw VideoFrame on buffer to Canvas2D</td>
            <td>{drawVideoFrameOnBufferToCanvas2D.averageTime}</td>
          </tr>
          <tr>
            <td>Draw VideoFrame from camera to Canvas2D</td>
            <td>{drawVideoFrameFromCameraToCanvas2D.averageTime}</td>
          </tr>
          <tr>
            <td>VideoFrame to ArrayBuffer RGBA</td>
            <td>{profilerTrameToBitmapToFrameToBuffer.averageTime}</td>
          </tr>
          <tr>
            <td>Use canvas.getImageData ArrayBuffer RGBA</td>
            <td>{profilerFrameToCanvasToBuffer.averageTime}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

const CameraSizeSelector = observer(() => {
  const { setCameraFrameSize, cameraWidth, cameraHeight } = useAppStore();

  return (
    <div className='input-wrap'>
      <label htmlFor=''>
        Camera resolution
        <select
          value={`${cameraWidth}x${cameraHeight}`}
          onChange={(e) => {
            const [width, height] = e.target.value.split('x');
            setCameraFrameSize(parseInt(width, 10), parseInt(height, 10));
          }}
        >
          <option value='1280x720'>1280x720</option>
          <option value='1920x1080'>1920x1080</option>
        </select>
      </label>
    </div>
  );
});

function useCanvasWrap(canvasElement: CanvasElement, title: string = '') {
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    canvasWrapRef.current!.appendChild(canvasElement.element);
    return () => {
      canvasWrapRef.current!.removeChild(canvasElement.element);
    };
  }, [canvasElement, canvasWrapRef]);

  return (
    <div>
      <h5>{title}</h5>
      <div ref={canvasWrapRef}></div>
    </div>
  );
}

const Canvas2DVideoFrameOnBufferWrap = observer(() => {
  const { canvas2DForVideoFrameOnBuffer: canvas2DForVideoFrameOnBuffer } =
    useAppStore();
  return useCanvasWrap(canvas2DForVideoFrameOnBuffer);
});
const Canvas2DVideoFrameFromCameraWrap = observer(() => {
  const { canvas2DForVideoFrameFromCamera } = useAppStore();
  return useCanvasWrap(canvas2DForVideoFrameFromCamera);
});
const Canvas2DResizedVideoFrameRGBAFromCameraWrap = observer(() => {
  const { canvas2DForResizedVideoFrameRGBA } = useAppStore();
  return useCanvasWrap(
    canvas2DForResizedVideoFrameRGBA,
    'VideoFrame -> ImageBitmap -> VideoFrame -> copyTo'
  );
});
const Canvas2DCanvasResizedVideoFrameRGBAFromCameraWrap = observer(() => {
  const { canvas2DForDrawingResizedVideoFrameRGBA } = useAppStore();
  return useCanvasWrap(
    canvas2DForDrawingResizedVideoFrameRGBA,
    'Canvas drawing for RGBA'
  );
});
const CanvasWebGLVideoFrameOnBufferWrap = observer(() => {
  const { canvasGLForVideoFrameOnBuffer } = useAppStore();
  return useCanvasWrap(canvasGLForVideoFrameOnBuffer);
});
const CanvasWebGLVideoFrameFromCameraWrap = observer(() => {
  const { canvasGLForVideoFrameFromCamera } = useAppStore();
  return useCanvasWrap(canvasGLForVideoFrameFromCamera);
});

const App = observer(() => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { processingGenerator } = useAppStore();

  useEffect(() => {
    if (!processingGenerator) {
      return () => {};
    }
    const stream = new MediaStream([processingGenerator]);
    videoRef.current!.srcObject = stream;
    videoRef.current!.play();

    return () => {
      console.log('unmounting');
    };
  }, [processingGenerator, videoRef]);

  return (
    <div className='App'>
      <CameraSizeSelector></CameraSizeSelector>
      <MediaStreamTrackGetter></MediaStreamTrackGetter>
      <Input></Input>
      <Statistics></Statistics>
      <video ref={videoRef}></video>
      <Canvas2DVideoFrameOnBufferWrap></Canvas2DVideoFrameOnBufferWrap>
      <Canvas2DVideoFrameFromCameraWrap></Canvas2DVideoFrameFromCameraWrap>
      <Canvas2DResizedVideoFrameRGBAFromCameraWrap></Canvas2DResizedVideoFrameRGBAFromCameraWrap>
      <Canvas2DCanvasResizedVideoFrameRGBAFromCameraWrap></Canvas2DCanvasResizedVideoFrameRGBAFromCameraWrap>
      <CanvasWebGLVideoFrameOnBufferWrap></CanvasWebGLVideoFrameOnBufferWrap>
      <CanvasWebGLVideoFrameFromCameraWrap></CanvasWebGLVideoFrameFromCameraWrap>
    </div>
  );
});

export default App;
