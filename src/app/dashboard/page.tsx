"use client";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

const mockWorkspaces = [
  { id: "ws1", name: "My workspace" },
  { id: "ws2", name: "Demo workspace" },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-12 bg-background ml-72">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-10">Your Workspaces</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {mockWorkspaces.map(ws => (
              <div
                key={ws.id}
                className="rounded-xl border shadow-md p-8 cursor-pointer hover:bg-muted transition-all flex flex-col items-start gap-2"
                onClick={() => router.push(`/workspace/${ws.id}`)}
              >
                <div className="rounded-full bg-primary w-12 h-12 flex items-center justify-center text-white text-xl font-bold mb-2">
                  {ws.name[0]}
                </div>
                <div className="font-semibold text-lg">{ws.name}</div>
                <div className="text-muted-foreground text-sm">Workspace</div>
              </div>
            ))}
            <div className="rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-all text-muted-foreground"
              onClick={() => { /* Aquí puedes abrir un modal para crear workspace */ }}
            >
              <span className="text-4xl font-bold mb-2">+</span>
              <span className="font-medium">New Workspace</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 