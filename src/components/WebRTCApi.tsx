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
import { Mic, MicOff, Download, Play, Pause } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
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
  const [inputDevices, setInputDevices] = useState<Device[]>([]);
  const [outputDevices, setOutputDevices] = useState<Device[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string | null>(
    null
  );
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<
    string | null
  >(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<any | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const checkOutputDeviceSupport = async () => {
    if (!('setSinkId' in HTMLAudioElement.prototype)) {
      setError('Your browser does not support audio output device selection');
      return false;
    }
    return true;
  };

  const updateDeviceList = async () => {
    try {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = deviceInfos
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId}`,
        }));

      const audioOutputs = deviceInfos
        .filter((device) => device.kind === 'audiooutput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId}`,
        }));

      setInputDevices(audioInputs);
      setOutputDevices(audioOutputs);
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setError('Failed to get audio devices');
    }
  };

  useEffect(() => {
    const initializeDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await updateDeviceList();
        await checkOutputDeviceSupport();

        navigator.mediaDevices.addEventListener(
          'devicechange',
          updateDeviceList
        );
      } catch (err) {
        console.error('Error initializing devices:', err);
        setError('Failed to initialize audio devices');
      }
    };

    initializeDevices();

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        updateDeviceList
      );
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStartTalking = async () => {
    if (selectedInputDevice) {
      try {
        setError(null);
        const constraints = {
          audio: { deviceId: { exact: selectedInputDevice } },
        };
        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        const { default: RecordRTC, StereoAudioRecorder } = await import(
          'recordrtc'
        );

        const primaryRecorder = new RecordRTC(newStream, {
          type: 'audio',
          mimeType: 'audio/wav',
          recorderType: StereoAudioRecorder,
          numberOfAudioChannels: 1,
          desiredSampRate: 16000,
        });

        primaryRecorder.startRecording();
        setRecorder(primaryRecorder);
        setStream(newStream);
      } catch (err) {
        console.error('Error starting recording:', err);
        setError('Failed to start recording');
      }
    }
  };

  const handleStopTalking = () => {
    if (recorder) {
      recorder.stopRecording(() => {
        const recordedBlob = recorder.getBlob();
        setAudioBlob(recordedBlob);
      });
      setRecorder(null);
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleDownloadAudio = () => {
    if (audioBlob && selectedInputDevice) {
      const micName = inputDevices.find(
        (device) => device.deviceId === selectedInputDevice
      )?.label;
      const filename = micName
        ? `${micName.replace(/[^a-z0-9]/gi, '_')}_recording.wav`
        : 'audio_recording.wav';

      const url = URL.createObjectURL(audioBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePlayAudio = async () => {
    if (!audioBlob || !selectedOutputDevice) return;

    try {
      setError(null);

      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }

      // Create a new AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioElementRef.current.src = audioUrl;

      try {
        // Check if setSinkId is supported
        if ('setSinkId' in audioElementRef.current) {
          await (audioElementRef.current as any).setSinkId(
            selectedOutputDevice
          );
          console.log('Audio output device set successfully');
        } else {
          console.warn('setSinkId not supported');
        }
      } catch (err) {
        console.error('Error setting audio output:', err);
        setError('Could not set audio output device. Using system default.');
      }

      await audioElementRef.current.play();
      setIsPlaying(true);

      audioElementRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  };

  const handlePauseAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        if (audioElementRef.current.src) {
          URL.revokeObjectURL(audioElementRef.current.src);
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Input Device
            </label>
            <Select
              onValueChange={setSelectedInputDevice}
              value={selectedInputDevice || ''}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Microphone" />
              </SelectTrigger>
              <SelectContent>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Output Device
            </label>
            <Select
              onValueChange={setSelectedOutputDevice}
              value={selectedOutputDevice || ''}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Speaker" />
              </SelectTrigger>
              <SelectContent>
                {outputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleStartTalking}
              disabled={!selectedInputDevice || !!stream}
            >
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
                <Button onClick={handleDownloadAudio} variant="secondary">
                  <Download className="mr-2 h-4 w-4" /> Download Audio
                </Button>
                <Button
                  onClick={isPlaying ? handlePauseAudio : handlePlayAudio}
                  disabled={!selectedOutputDevice}
                  variant="secondary"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Play
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        {stream && <DecibelMeter stream={stream} />}
      </CardContent>
    </Card>
  );
};

const WebRTCApi: React.FC = () => (
  <div className="container mx-auto p-6 w-fit">
    <h1 className="text-3xl font-bold mb-6">Mic and Speaker Audio Routing </h1>
    <Section title="Sales" />
    <Section title="Client" />
  </div>
);

export default WebRTCApi;
