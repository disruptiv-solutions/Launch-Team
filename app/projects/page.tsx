"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderKanban, Loader2, Search, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Project = {
  id: string;
  name: string;
  description?: string;
  updatedAt?: { seconds: number; nanoseconds: number };
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const hay = `${p.name} ${p.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [projects, query]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) {
      console.error('Error loading projects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async () => {
    const name = newName.trim();
    const description = newDescription.trim();
    if (!name) return;

    try {
      setIsCreating(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(description ? { description } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create project');
      }
      const data = await res.json();
      const project: Project | undefined = data?.project;
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      await loadProjects();
      if (project?.id) router.push(`/projects/${project.id}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-none">
                <FolderKanban className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Projects</h1>
                <p className="mt-1 text-xs font-semibold text-neutral-400">
                  Organize chats, documents, and prompts by project.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-900"
            >
              Back to Chat
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-10 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-xs font-semibold text-neutral-500">
            {isLoading ? 'Loading…' : `${filtered.length} project${filtered.length === 1 ? '' : 's'}`}
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading projects…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
              <p className="text-sm font-semibold text-neutral-200">No projects yet.</p>
              <p className="mt-1 text-sm text-neutral-400">
                Create your first project to keep chats and documents organized.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-left transition-colors hover:bg-neutral-850"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold tracking-tight text-neutral-100">
                        {p.name}
                      </div>
                      {p.description ? (
                        <div className="mt-1 line-clamp-2 text-sm text-neutral-400">{p.description}</div>
                      ) : (
                        <div className="mt-1 text-sm text-neutral-500">No description</div>
                      )}
                    </div>
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-[10px] font-bold text-neutral-400 group-hover:text-neutral-200">
                      Open
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 p-5">
              <div>
                <div className="text-sm font-extrabold text-neutral-100">Create Project</div>
                <div className="mt-1 text-xs font-semibold text-neutral-400">Name + description.</div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="block text-xs font-bold text-neutral-200">Project name *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., ACME Launch Plan"
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-200">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-800 p-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={isCreating || !newName.trim()}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors',
                  isCreating || !newName.trim() ? 'bg-neutral-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

