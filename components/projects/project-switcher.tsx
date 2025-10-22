"use client";

import { useState } from "react";
import { ChevronDownIcon, PlusIcon, FolderIcon, CheckIcon } from "lucide-react";
import clsx from "clsx";

import { useProject } from "@/contexts/project-context";

export function ProjectSwitcher() {
  const { currentProject, projects, setCurrentProject, createProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const project = await createProject(newProjectName);
    if (project) {
      setNewProjectName("");
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-sm transition hover:border-slate-700 hover:bg-slate-900/80"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <FolderIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate text-white">
            {currentProject?.name || "Select Project"}
          </span>
        </div>
        <ChevronDownIcon
          className={clsx(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
              setNewProjectName("");
            }}
          />

          {/* Menu */}
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl">
            {/* Projects List */}
            <div className="max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setCurrentProject(project);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition",
                    currentProject?.id === project.id
                      ? "bg-brand-500/20 text-brand-100"
                      : "text-slate-300 hover:bg-slate-800/60"
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderIcon className="h-4 w-4 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="truncate font-medium">{project.name}</p>
                      {project._count && project._count.renders > 0 && (
                        <p className="truncate text-xs text-slate-400">
                          {project._count.renders} render{project._count.renders !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {currentProject?.id === project.id && (
                    <CheckIcon className="h-4 w-4 shrink-0 text-brand-400" />
                  )}
                </button>
              ))}

              {projects.length === 0 && !isCreating && (
                <div className="px-3 py-4 text-center text-sm text-slate-400">
                  No projects yet. Create one to get started.
                </div>
              )}
            </div>

            {/* Divider */}
            {projects.length > 0 && (
              <div className="border-t border-slate-800" />
            )}

            {/* Create Project Form */}
            {isCreating ? (
              <form onSubmit={handleCreateProject} className="p-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                  maxLength={100}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={!newProjectName.trim()}
                    className="flex-1 rounded bg-brand-500 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewProjectName("");
                    }}
                    className="flex-1 rounded border border-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800/60"
              >
                <PlusIcon className="h-4 w-4" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
