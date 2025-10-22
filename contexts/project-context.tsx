"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  brandKit?: any;
  _count?: {
    renders: number;
  };
};

type ProjectContextType = {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setCurrentProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project | null>;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");

      const data = await response.json();
      setProjects(data.projects);

      // If no current project, set first or create default
      if (!currentProject && data.projects.length > 0) {
        setCurrentProject(data.projects[0]);
      } else if (!currentProject && data.projects.length === 0) {
        // Create default project
        const defaultResponse = await fetch("/api/projects/default");
        if (defaultResponse.ok) {
          const defaultData = await defaultResponse.json();
          setCurrentProject(defaultData.project);
          setProjects([defaultData.project]);
        }
      }
    } catch (error) {
      console.error("Failed to refresh projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (name: string, description?: string): Promise<Project | null> => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) throw new Error("Failed to create project");

      const data = await response.json();
      await refreshProjects();
      setCurrentProject(data.project);
      return data.project;
    } catch (error) {
      console.error("Failed to create project:", error);
      return null;
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        isLoading,
        setCurrentProject,
        refreshProjects,
        createProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
