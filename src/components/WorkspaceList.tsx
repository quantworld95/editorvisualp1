import { Button } from "./ui/button";

interface WorkspaceListProps {
  workspaces: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export default function WorkspaceList({ workspaces, selectedId, onSelect, onCreate }: WorkspaceListProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Workspaces</h2>
        <Button size="sm" variant="ghost" onClick={onCreate}>+ New</Button>
      </div>
      <ul className="space-y-1">
        {workspaces.map(ws => (
          <li key={ws.id}>
            <Button
              variant={ws.id === selectedId ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onSelect(ws.id)}
            >
              {ws.name}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
} 