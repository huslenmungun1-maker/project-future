import { CoreAssistantPanel } from "./CoreAssistantPanel";

export default function StudioPage() {
  return (
    <div className="grid grid-cols-[2fr,1fr] gap-4 p-4">
      {/* LEFT SIDE: future content */}
      <div className="border rounded-xl p-4">
        <h1 className="text-lg font-bold mb-2">Studio Dashboard</h1>
        <p className="text-sm text-gray-500">Your series, chapters, stats will appear here soon.</p>
      </div>

      {/* RIGHT SIDE: Core Assistant */}
      <div className="h-[80vh]">
        <CoreAssistantPanel />
      </div>
    </div>
  );
}
