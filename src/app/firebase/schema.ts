import { Database } from 'firebase/database';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  members: {
    [userId: string]: {
      role: 'owner' | 'editor' | 'viewer';
      joinedAt: number;
    }
  };
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  pages: {
    [pageId: string]: Page;
  };
  collaborators: {
    [userId: string]: {
      role: 'editor' | 'viewer';
      invitedAt: number;
      invitedBy: string;
    }
  };
}

export interface Page {
  id: string;
  projectId: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastModifiedBy: string;
  version: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  workspaces: {
    [workspaceId: string]: {
      role: 'owner' | 'editor' | 'viewer';
      joinedAt: number;
    }
  };
  projects: {
    [projectId: string]: {
      role: 'editor' | 'viewer';
      joinedAt: number;
    }
  };
}

export interface Invitation {
  id: string;
  type: 'workspace' | 'project';
  targetId: string;
  email: string;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  expiresAt: number;
  createdBy: string;
}

export interface Change {
  id: string;
  type: 'create' | 'update' | 'delete';
  targetType: 'page' | 'project' | 'workspace';
  targetId: string;
  userId: string;
  timestamp: number;
  data: any;
  version: number;
}

// Funciones de utilidad para la base de datos
export const createWorkspace = async (db: Database, workspace: Omit<Workspace, 'id'>) => {
  // Implementación
};

export const createProject = async (db: Database, project: Omit<Project, 'id'>) => {
  // Implementación
};

export const createPage = async (db: Database, page: Omit<Page, 'id'>) => {
  // Implementación
};

export const inviteUser = async (db: Database, invitation: Omit<Invitation, 'id'>) => {
  // Implementación
};

export const applyChange = async (db: Database, change: Omit<Change, 'id'>) => {
  // Implementación
}; 