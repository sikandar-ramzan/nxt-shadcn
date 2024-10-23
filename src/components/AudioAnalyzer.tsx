'use client';

import React, { useState, useEffect, useRef } from 'react';

const DecibelMeter = ({ stream }) => {
  const [decibel, setDecibel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  useEffect(() => {
    if (stream && stream.active) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      dataArrayRef.current = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );

      const updateDecibel = () => {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const maxVal = Math.max(...dataArrayRef.current);
        setDecibel(maxVal);
        requestAnimationFrame(updateDecibel);
      };
      updateDecibel();
    }

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stream]);

  return (
    <div style={{ marginTop: '10px' }}>
      <div>Decibel Level: {decibel} dB</div>
      <div
        style={{
          width: '100%',
          height: '20px',
          backgroundColor: 'lightgray',
          marginTop: '5px',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${(decibel / 256) * 100}%`,
            height: '100%',
            backgroundColor: 'red',
            transition: 'width 0.1s',
          }}
        />
      </div>
    </div>
  );
};

const Section = ({ title }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
      const audioDevices = deviceInfos.filter(
        (device) => device.kind === 'audioinput'
      );
      setDevices(audioDevices);
    });
  }, []);

  const handleStartTalking = async () => {
    if (selectedDevice) {
      const constraints = { audio: { deviceId: selectedDevice } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(stream);
    }
  };

  const handleStopTalking = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2>{title}</h2>
      <select
        onChange={(e) => setSelectedDevice(e.target.value)}
        value={selectedDevice || ''}
      >
        <option value="">Select Microphone</option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${device.deviceId}`}
          </option>
        ))}
      </select>
      <div style={{ marginTop: '10px' }}>
        <button onClick={handleStartTalking} disabled={!selectedDevice}>
          Start Talking
        </button>
        <button
          onClick={handleStopTalking}
          style={{ marginLeft: '10px' }}
          disabled={!stream}
        >
          Stop Talking
        </button>
      </div>
      {stream && <DecibelMeter stream={stream} />}
    </div>
  );
};

const AudioMonitor = () => (
  <div style={{ padding: '20px' }}>
    <h1>Microphone Decibel Meter</h1>
    <Section title="Sales" />
    <Section title="Client" />
  </div>
);

export default AudioMonitor;
