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
        },
      })
      .then((stream) => {
        const videoTrack = stream.getVideoTracks()[0];
        setInputVideoTrack(videoTrack);
      });
  }, [cameraHeight, cameraWidth]);

  return null;
});

const Input = observer(() => {
  const {
    copyWidth,
    copyHeight,
    copyX,
    copyY,
    setCopyX,
    setCopyY,
    setCopyWidth,
    setCopyHeight,
  } = useAppStore();
  return (
    <div id='input-wrap'>
      <label htmlFor=''>
        X
        <input
          type='number'
          value={copyX}
          min={0}
          max={1280 - copyWidth}
          onChange={(e) => setCopyX(parseInt(e.target.value, 10))}
        />
      </label>
      <label htmlFor=''>
        Y
        <input
          type='number'
          value={copyY}
          min={0}
          max={720 - copyHeight}
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
          max={1280 - copyX}
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
          max={720 - copyY}
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
  }, [processingGenerator, videoRef]);

  return (
    <div className='App'>
      <MediaStreamTrackGetter></MediaStreamTrackGetter>
      <Input></Input>
      <Statistics></Statistics>
      <video ref={videoRef}></video>
    </div>
  );
});

export default App;
