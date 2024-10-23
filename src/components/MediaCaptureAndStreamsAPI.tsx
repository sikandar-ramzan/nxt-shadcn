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
import { Mic, MicOff, Download, Play } from 'lucide-react';

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

  const decibelLevelPercentage = Math.round(decibel);

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
  const [speakers, setSpeakers] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission to access the microphone
        await navigator.mediaDevices.getUserMedia({ audio: true });
        // Enumerate devices once permission is granted
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = deviceInfos.filter(
          (device) => device.kind === 'audioinput'
        );
        const audioOutputs = deviceInfos.filter(
          (device) => device.kind === 'audiooutput'
        );
        setDevices(audioDevices as Device[]);
        setSpeakers(audioOutputs as Device[]);
      } catch (error) {
        console.error('Error accessing devices:', error);
      }
    };

    getDevices();
  }, []);

  const handleStartTalking = async () => {
    if (selectedDevice) {
      try {
        const constraints = { audio: { deviceId: { exact: selectedDevice } } };
        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        setStream(newStream);

        const recorder = new MediaRecorder(newStream, {
          mimeType: 'audio/wav',
          audioBitsPerSecond: 16000, // Set to 16kHz sampling rate
        });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setAudioChunks((prev) => [...prev, event.data]);
          }
        };

        recorder.start();
        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const handleStopTalking = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        setAudioChunks([]);
      };
      setMediaRecorder(null);
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handlePlayAudio = () => {
    if (audioBlob && selectedSpeaker) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;

      // Set the output device if supported
      if (audio.setSinkId) {
        audio.setSinkId(selectedSpeaker).catch((err) => {
          console.error('Error setting output device:', err);
        });
      }

      audio.play().catch((err) => console.error('Error playing audio:', err));
    }
  };

  const handleDownloadAudio = () => {
    if (audioBlob && selectedDevice) {
      const micName = devices.find(
        (device) => device.deviceId === selectedDevice
      )?.label;
      const filename = micName
        ? `${micName.replace(/[^a-z0-9]/gi, '_')}_recording.wav`
        : 'audio_recording.wav';

      const link = document.createElement('a');
      link.href = URL.createObjectURL(audioBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
              <SelectItem
                key={device.deviceId}
                value={device.deviceId || `device-${Math.random()}`}
              >
                {device.label || `Microphone ${device.deviceId}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={setSelectedSpeaker}
          value={selectedSpeaker || ''}
        >
          <SelectTrigger className="w-full mt-4">
            <SelectValue placeholder="Select Speaker" />
          </SelectTrigger>
          <SelectContent>
            {speakers.map((device) => (
              <SelectItem
                key={device.deviceId}
                value={device.deviceId || `device-${Math.random()}`}
              >
                {device.label || `Speaker ${device.deviceId}`}
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
          {audioBlob && (
            <>
              <Button onClick={handlePlayAudio} variant="secondary">
                <Play className="mr-2 h-4 w-4" /> Play Audio
              </Button>
              <Button onClick={handleDownloadAudio} variant="secondary">
                <Download className="mr-2 h-4 w-4" /> Download Audio
              </Button>
            </>
          )}
        </div>
        {stream && <DecibelMeter stream={stream} />}
      </CardContent>
    </Card>
  );
};

const MediaCaptureAndStreamsAPI: React.FC = () => (
  <div className="container mx-auto p-6">
    <h1 className="text-3xl font-bold mb-6">Microphone Decibel Meter</h1>
    <Section title="Sales" />
    <Section title="Client" />
  </div>
);

export default MediaCaptureAndStreamsAPI;
