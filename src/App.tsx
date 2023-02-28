import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { useAppStore } from './app-store';

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
  const { videoFrameProcessingTime, copiedBufferSize } = useAppStore();

  return (
    <div id='statistics'>
      <p>Copied buffer size: {copiedBufferSize}</p>
      <p>
        Average time copy from VideoFrame to ArrayBuffer:{' '}
        {videoFrameProcessingTime} ms
      </p>
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
    </div>
  );
});

export default App;
