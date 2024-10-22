'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function ChatSpeechRecognition() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [salesTeamDevice, setSalesTeamDevice] = useState<string>('');
  const [clientDevice, setClientDevice] = useState<string>('');
  const [isSalesTeamTalking, setIsSalesTeamTalking] = useState(false);
  const [isClientTalking, setIsClientTalking] = useState(false);
  const [salesTeamText, setSalesTeamText] = useState('');
  const [clientText, setClientText] = useState('');

  // Keep references to recognition instances
  const salesTeamRecognitionRef = useRef<SpeechRecognition | null>(null);
  const clientRecognitionRef = useRef<SpeechRecognition | null>(null);

  // Debug state
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLog((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        setDevices(devices.filter((device) => device.kind === 'audioinput'))
      )
      .catch((err) => console.error('Error enumerating devices:', err));
  }, []);

  const createSpeechRecognition = (isSalesTeam: boolean) => {
    try {
      const recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();

      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;

      // Add event listeners for debugging
      recognition.onstart = () => {
        addDebugLog(
          `Recognition started for ${isSalesTeam ? 'Sales Team' : 'Client'}`
        );
      };

      recognition.onend = () => {
        addDebugLog(
          `Recognition ended for ${isSalesTeam ? 'Sales Team' : 'Client'}`
        );

        // Auto-restart if still in talking state
        if (
          (isSalesTeam && isSalesTeamTalking) ||
          (!isSalesTeam && isClientTalking)
        ) {
          addDebugLog(
            `Attempting to restart recognition for ${
              isSalesTeam ? 'Sales Team' : 'Client'
            }`
          );
          try {
            recognition.start();
          } catch (error) {
            addDebugLog(`Error restarting recognition: ${error}`);
          }
        }
      };

      recognition.onerror = (event) => {
        addDebugLog(
          `Recognition error for ${isSalesTeam ? 'Sales Team' : 'Client'}: ${
            event.error
          }`
        );

        if (event.error === 'aborted') {
          // Handle aborted error by attempting to restart
          setTimeout(() => {
            if (
              (isSalesTeam && isSalesTeamTalking) ||
              (!isSalesTeam && isClientTalking)
            ) {
              try {
                recognition.start();
                addDebugLog(
                  `Restarted recognition after abort for ${
                    isSalesTeam ? 'Sales Team' : 'Client'
                  }`
                );
              } catch (error) {
                addDebugLog(`Failed to restart after abort: ${error}`);
              }
            }
          }, 100);
        }
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');

        if (isSalesTeam) {
          setSalesTeamText(transcript);
        } else {
          setClientText(transcript);
        }
      };

      return recognition;
    } catch (error) {
      addDebugLog(`Error creating recognition instance: ${error}`);
      return null;
    }
  };

  const handleStartTalking = (isSalesTeam: boolean) => {
    try {
      const recognition = createSpeechRecognition(isSalesTeam);

      if (!recognition) {
        addDebugLog('Failed to create recognition instance');
        return;
      }

      if (isSalesTeam) {
        if (salesTeamRecognitionRef.current) {
          addDebugLog('Stopping existing Sales Team recognition');
          salesTeamRecognitionRef.current.stop();
        }
        salesTeamRecognitionRef.current = recognition;
        setIsSalesTeamTalking(true);
      } else {
        if (clientRecognitionRef.current) {
          addDebugLog('Stopping existing Client recognition');
          clientRecognitionRef.current.stop();
        }
        clientRecognitionRef.current = recognition;
        setIsClientTalking(true);
      }

      recognition.start();
    } catch (error) {
      addDebugLog(`Error starting recognition: ${error}`);
    }
  };

  const handleStopTalking = (isSalesTeam: boolean) => {
    try {
      if (isSalesTeam) {
        if (salesTeamRecognitionRef.current) {
          salesTeamRecognitionRef.current.stop();
          salesTeamRecognitionRef.current = null;
        }
        setIsSalesTeamTalking(false);
      } else {
        if (clientRecognitionRef.current) {
          clientRecognitionRef.current.stop();
          clientRecognitionRef.current = null;
        }
        setIsClientTalking(false);
      }
    } catch (error) {
      addDebugLog(`Error stopping recognition: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chat Speech Recognition</h1>

      <div className="grid grid-cols-2 gap-4">
        {/* Sales Team Section */}
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Sales Team</h2>
          <Select onValueChange={setSalesTeamDevice}>
            <SelectTrigger>
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem
                  key={device.deviceId}
                  value={device.deviceId || `device-${Math.random()}`}
                >
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => handleStartTalking(true)}
              disabled={isSalesTeamTalking}
            >
              Start Talking
            </Button>
            <Button
              onClick={() => handleStopTalking(true)}
              disabled={!isSalesTeamTalking}
              variant="destructive"
            >
              Stop Talking
            </Button>
          </div>
          <Textarea
            className="mt-2"
            value={salesTeamText}
            readOnly
            placeholder="Start talking..."
            rows={10}
          />
        </div>

        {/* Client Section */}
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Client</h2>
          <Select onValueChange={setClientDevice}>
            <SelectTrigger>
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem
                  key={device.deviceId}
                  value={device.deviceId || `device-${Math.random()}`}
                >
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => handleStartTalking(false)}
              disabled={isClientTalking}
            >
              Start Talking
            </Button>
            <Button
              onClick={() => handleStopTalking(false)}
              disabled={!isClientTalking}
              variant="destructive"
            >
              Stop Talking
            </Button>
          </div>
          <Textarea
            className="mt-2"
            value={clientText}
            readOnly
            placeholder="Start talking..."
            rows={10}
          />
        </div>
      </div>

      {/* Debug Log Section */}
      <div className="mt-4 border p-4 rounded bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">Debug Log</h3>
        <pre className="text-sm overflow-auto max-h-40">
          {debugLog.join('\n')}
        </pre>
      </div>
    </div>
  );
}
