import WebRTCApi from '@/components/WebRTCApi';
export default function Home() {
  return (
    <div className="flex items-center justify-items-center min-h-screen">
      <main className="flex flex-col row-start-2 items-center justify-center w-full">
        <WebRTCApi />
      </main>
    </div>
  );
}
