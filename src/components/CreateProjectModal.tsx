"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useState } from "react";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}

export default function CreateProjectModal({ open, onOpenChange, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name your project</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="project-name">Project name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter project name"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 