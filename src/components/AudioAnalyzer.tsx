'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

interface DecibelMeterProps {
  stream: MediaStream | null;
}

const DecibelMeter: React.FC<DecibelMeterProps> = ({ stream }) => {
  const [decibel, setDecibel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (stream && stream.active) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      dataArrayRef.current = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );

      const updateDecibel = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          const rms = Math.sqrt(
            dataArrayRef.current.reduce((sum, value) => sum + value ** 2, 0) /
              dataArrayRef.current.length
          );
          const decibelValue = 20 * Math.log10(rms);
          setDecibel(decibelValue > -Infinity ? decibelValue : 0);
          requestAnimationFrame(updateDecibel);
        }
      };
      updateDecibel();
    }

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stream]);

  // const decibelLevelPercentage =
  //   Math.min(Math.max((decibel + 100) / 100, 0), 1) * 10; // Normalize for level indicator

  //get decibel as whole numbers
  const decibelLevelPercentage = Math.round(decibel);

  console.log('Mic Name: ', stream?.getAudioTracks()[0].label);
  console.log('DecibelLevelPercentage: ', decibelLevelPercentage);

  return (
    <div className="mt-4">
      <div className="text-sm font-medium">
        Decibel Level: {decibel.toFixed(2)} dB
      </div>
      <div className="w-full h-4 bg-secondary mt-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${
            decibelLevelPercentage > 36
              ? 'bg-destructive'
              : decibelLevelPercentage > 30
              ? 'bg-yellow-400'
              : 'bg-blue-400'
          }`}
          style={{ width: `${decibelLevelPercentage + 60}%` }}
        />
      </div>
    </div>
  );
};

interface Device {
  deviceId: string;
  label: string;
}

const Section: React.FC<{ title: string }> = ({ title }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
      const audioDevices = deviceInfos.filter(
        (device) => device.kind === 'audioinput'
      );
      setDevices(audioDevices as Device[]);
    });
  }, []);

  const handleStartTalking = async () => {
    if (selectedDevice) {
      try {
        const constraints = { audio: { deviceId: { exact: selectedDevice } } };
        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        setStream(newStream);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const handleStopTalking = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Select onValueChange={setSelectedDevice} value={selectedDevice || ''}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Microphone" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-4 mt-4">
          <Button onClick={handleStartTalking} disabled={!selectedDevice}>
            <Mic className="mr-2 h-4 w-4" /> Start Talking
          </Button>
          <Button
            onClick={handleStopTalking}
            disabled={!stream}
            variant="secondary"
          >
            <MicOff className="mr-2 h-4 w-4" /> Stop Talking
          </Button>
        </div>
        {stream && <DecibelMeter stream={stream} />}
      </CardContent>
    </Card>
  );
};

const AudioMonitor: React.FC = () => (
  <div className="container mx-auto p-6">
    <h1 className="text-3xl font-bold mb-6">Microphone Decibel Meter</h1>
    <Section title="Sales" />
    <Section title="Client" />
  </div>
);

export default AudioMonitor;
