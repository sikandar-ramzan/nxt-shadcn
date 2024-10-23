'use client';
import MediaCaptureAndStreamsAPI from '@/components/MediaCaptureAndStreamsAPI';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import WebRTCApi from '@/components/WebRTCApi';
import { useState } from 'react';
export default function Home() {
  const [currentAPI, setCurrentAPI] = useState('WebRTCApi');

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentAPI(event.target.value);
  };
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-3xl font-bold">
          Audio Input Using {`${currentAPI}`}
        </h1>
        <Select onValueChange={setCurrentAPI} value={currentAPI || ''}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Audio Streaming API" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key={'001'} value={'WebRTCApi'}>
              Web RTC API
            </SelectItem>
            <SelectItem key={'002'} value={'MediaCaptureAndStreamsAPI'}>
              Media Capture and Streams API
            </SelectItem>
          </SelectContent>
        </Select>
        {currentAPI === 'WebRTCApi' && <WebRTCApi />}
        {currentAPI === 'MediaCaptureAndStreamsAPI' && (
          <MediaCaptureAndStreamsAPI />
        )}
      </main>
    </div>
  );
}
