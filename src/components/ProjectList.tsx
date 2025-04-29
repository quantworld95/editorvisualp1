import { Button } from "./ui/button";

interface ProjectListProps {
  projects: { id: string; name: string; updatedAt: string }[];
  onCreate: () => void;
  onSelect: (id: string) => void;
}

export default function ProjectList({ projects, onCreate, onSelect }: ProjectListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Button onClick={onCreate}>+ Create Project</Button>
      </div>
      <div className="space-y-2">
        {projects.length === 0 ? (
          <div className="text-muted-foreground text-sm">No projects yet.</div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="border rounded p-3 cursor-pointer hover:bg-muted"
              onClick={() => onSelect(project.id)}
            >
              <div className="font-medium">{project.name}</div>
              <div className="text-xs text-muted-foreground">Last edited: {project.updatedAt}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 