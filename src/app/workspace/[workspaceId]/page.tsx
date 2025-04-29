"use client";
import Sidebar from "@/components/Sidebar";
import ProjectList from "@/components/ProjectList";
import CreateProjectModal from "@/components/CreateProjectModal";
import { useState } from "react";
import { useRouter } from "next/navigation";

const mockProjects = [
  { id: "p1", name: "Hola template", updatedAt: "15 min ago" },
  { id: "p2", name: "Demo Project", updatedAt: "1 day ago" },
];

export default function WorkspacePage({ params }: { params: { workspaceId: string } }) {
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState(mockProjects);
  const router = useRouter();

  const handleCreateProject = (name: string) => {
    const newId = `p${projects.length + 1}`;
    setProjects([
      ...projects,
      { id: newId, name, updatedAt: "just now" },
    ]);
    setShowModal(false);
    router.push(`/project/${newId}/editor`);
  };

  const handleSelectProject = (id: string) => {
    router.push(`/project/${id}/editor`);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-12 bg-background ml-72">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-10">Projects</h1>
          <ProjectList
            projects={projects}
            onCreate={() => setShowModal(true)}
            onSelect={handleSelectProject}
          />
        </div>
        <CreateProjectModal
          open={showModal}
          onOpenChange={setShowModal}
          onCreate={handleCreateProject}
        />
      </main>
    </div>
  );
} 