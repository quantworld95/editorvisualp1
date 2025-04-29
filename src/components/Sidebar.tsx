import { Button } from "./ui/button";

export default function Sidebar() {
  return (
    <aside className="w-72 h-screen bg-muted border-r flex flex-col justify-between fixed top-0 left-0">
      <div>
        <div className="p-6 border-b flex items-center gap-3">
          <div className="rounded-full bg-primary w-10 h-10 flex items-center justify-center text-white text-lg font-bold">M</div>
          <span className="font-semibold text-lg">My workspace</span>
        </div>
        <nav className="flex-1 p-6">
          <ul className="space-y-3 mb-8">
            <li>
              <Button variant="ghost" className="w-full justify-start text-base py-3">New Workspace</Button>
            </li>
          </ul>
          <div className="mt-6 text-xs text-muted-foreground uppercase tracking-wider">Resources</div>
          <ul className="space-y-2 mt-3">
            <li><a href="#" className="text-base hover:underline">Demo Project</a></li>
            <li><a href="#" className="text-base hover:underline">Video Tutorials</a></li>
            <li><a href="#" className="text-base hover:underline">Help Center</a></li>
            <li><a href="#" className="text-base hover:underline">Discord</a></li>
            <li><a href="#" className="text-base hover:underline">Github</a></li>
          </ul>
        </nav>
      </div>
      <div className="p-6 border-t flex items-center gap-3">
        <div className="rounded-full bg-neutral-800 w-10 h-10 flex items-center justify-center text-white text-lg font-bold shadow">N</div>
        <span className="font-medium">Condori Nataly</span>
      </div>
    </aside>
  );
} 