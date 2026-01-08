"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Plus,
  FileText,
  Upload,
  Trash2,
  Settings,
  Users,
  Bot,
  Save,
} from 'lucide-react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type ProjectAssignment =
  | { mode: 'team'; teamId: string }
  | { mode: 'agent'; agentId: string };

type Project = {
  id: string;
  name: string;
  description?: string;
  projectPrompt?: string;
  assignment?: ProjectAssignment;
};

type ProjectChat = {
  id: string;
  title: string;
  updatedAt?: { seconds: number; nanoseconds: number };
  messageCount?: number;
};

type ProjectDocument =
  | { id: string; type: 'text'; title: string; content: string; updatedAt?: { seconds: number; nanoseconds: number } }
  | {
      id: string;
      type: 'file';
      title: string;
      file: { name: string; contentType: string; sizeBytes: number; storagePath: string; url: string };
      extractedText?: string;
      updatedAt?: { seconds: number; nanoseconds: number };
    };

type Team = { id: string; name: string };
type Agent = { id: string; name: string; description?: string };

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [chats, setChats] = useState<ProjectChat[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [assignmentMode, setAssignmentMode] = useState<'team' | 'agent'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [projectPrompt, setProjectPrompt] = useState('');

  const [newTextDocTitle, setNewTextDocTitle] = useState('');
  const [newTextDocContent, setNewTextDocContent] = useState('');
  const [isCreatingTextDoc, setIsCreatingTextDoc] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingFileDoc, setIsUploadingFileDoc] = useState(false);

  const loadAll = async () => {
    try {
      setIsLoading(true);

      const [pRes, cRes, dRes, tRes, aRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/chats`),
        fetch(`/api/projects/${projectId}/documents`),
        fetch('/api/teams'),
        fetch('/api/agents'),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        const p: Project | null = pData.project || null;
        setProject(p);

        const a = p?.assignment;
        if (a?.mode === 'agent') {
          setAssignmentMode('agent');
          setSelectedAgentId(a.agentId || '');
        } else if (a?.mode === 'team') {
          setAssignmentMode('team');
          setSelectedTeamId(a.teamId || '');
        }
        setProjectPrompt(p?.projectPrompt || '');
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setChats(cData.chats || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDocuments(dData.documents || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeams(tData.teams || []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAgents(aData.agents || []);
      }
    } catch (e) {
      console.error('Error loading project:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreateChat = async () => {
    try {
      setIsCreatingChat(true);
      const res = await fetch(`/api/projects/${projectId}/chats`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create chat');
      }
      const data = await res.json();
      const chat: ProjectChat | undefined = data.chat;
      await loadAll();
      if (chat?.id) router.push(`/projects/${projectId}/${chat.id}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to create chat');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      const trimmedPrompt = projectPrompt.trim();
      const assignment: ProjectAssignment =
        assignmentMode === 'agent'
          ? { mode: 'agent', agentId: selectedAgentId }
          : { mode: 'team', teamId: selectedTeamId };

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(trimmedPrompt ? { projectPrompt: trimmedPrompt } : { projectPrompt: '' }),
          assignment,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to save settings');
      }
      await loadAll();
      alert('Project saved.');
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to save project');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateTextDoc = async () => {
    const title = newTextDocTitle.trim();
    const content = newTextDocContent.trim();
    if (!title || !content) return;

    try {
      setIsCreatingTextDoc(true);
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', title, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create document');
      }
      setNewTextDocTitle('');
      setNewTextDocContent('');
      await loadAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to create document');
    } finally {
      setIsCreatingTextDoc(false);
    }
  };

  const handleDeleteProjectDoc = async (docId: string) => {
    if (!confirm('Delete this project document?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/documents?docId=${encodeURIComponent(docId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return;
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (e) {
      console.error('Delete document error:', e);
    }
  };

  const handleUploadFileDoc = async (file: File) => {
    try {
      setIsUploadingFileDoc(true);
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const id = `patt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const storagePath = `projects/${projectId}/documents/${id}_${safeName}`;

      const ref = storageRef(storage, storagePath);
      const task = uploadBytesResumable(ref, file, { contentType: file.type });

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', undefined, reject, () => resolve());
      });

      const url = await getDownloadURL(task.snapshot.ref);
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'file',
          title: file.name,
          file: {
            name: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            storagePath,
            url,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to save file document');
      }
      await loadAll();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to upload document');
    } finally {
      setIsUploadingFileDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const orderedChats = useMemo(() => chats, [chats]);
  const orderedDocs = useMemo(() => documents, [documents]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading project…
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 max-w-lg">
          <div className="text-sm font-extrabold">Project not found</div>
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/projects')}
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-900 inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Projects
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-neutral-100">{project.name}</div>
              <div className="truncate text-xs font-semibold text-neutral-500">
                {project.description || 'No description'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors',
                isSavingSettings ? 'bg-neutral-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              )}
            >
              {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Project
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 p-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <div className="text-sm font-extrabold">Chats</div>
              </div>
              <button
                onClick={handleCreateChat}
                disabled={isCreatingChat}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors',
                  isCreatingChat ? 'bg-neutral-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                )}
              >
                {isCreatingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                New Chat
              </button>
            </div>
            <div className="p-5">
              {orderedChats.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                  <div className="text-sm font-semibold text-neutral-200">No chats yet</div>
                  <div className="mt-1 text-sm text-neutral-400">Start a chat to begin working in this project.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderedChats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => router.push(`/projects/${projectId}/${c.id}`)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left hover:bg-neutral-900"
                    >
                      <div className="text-sm font-extrabold text-neutral-100">{c.title}</div>
                      <div className="mt-1 text-xs font-semibold text-neutral-500">
                        {typeof c.messageCount === 'number' ? `${c.messageCount} messages` : 'Open chat'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                <div className="text-sm font-extrabold">Project Documents</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    handleUploadFileDoc(f);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFileDoc}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors',
                    isUploadingFileDoc ? 'bg-neutral-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                  )}
                >
                  {isUploadingFileDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload File
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-xs font-bold text-neutral-200">Add text document</div>
                <input
                  value={newTextDocTitle}
                  onChange={(e) => setNewTextDocTitle(e.target.value)}
                  placeholder="Doc title"
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={newTextDocContent}
                  onChange={(e) => setNewTextDocContent(e.target.value)}
                  placeholder="Paste content here…"
                  rows={6}
                  className="mt-2 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleCreateTextDoc}
                  disabled={isCreatingTextDoc || !newTextDocTitle.trim() || !newTextDocContent.trim()}
                  className={cn(
                    'mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors',
                    isCreatingTextDoc || !newTextDocTitle.trim() || !newTextDocContent.trim()
                      ? 'bg-neutral-600 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  )}
                >
                  {isCreatingTextDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {orderedDocs.length === 0 ? (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                    <div className="text-sm font-semibold text-neutral-200">No project documents</div>
                    <div className="mt-1 text-sm text-neutral-400">
                      Add text docs or upload files to include them in project chat context.
                    </div>
                  </div>
                ) : (
                  orderedDocs.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-neutral-100 truncate">{d.title}</div>
                        <div className="mt-1 text-xs font-semibold text-neutral-500">
                          {d.type === 'file'
                            ? `${d.file?.contentType || 'file'} • ${(d.file?.sizeBytes || 0) / 1024 > 1024 ? `${((d.file.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB` : `${Math.round((d.file.sizeBytes || 0) / 1024)} KB`}`
                            : `${(d.content || '').length.toLocaleString()} chars`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteProjectDoc(d.id)}
                        className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 hover:bg-neutral-800"
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="flex items-center gap-2 border-b border-neutral-800 p-5">
              <Settings className="h-4 w-4 text-indigo-400" />
              <div className="text-sm font-extrabold">Project Settings</div>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <div className="text-xs font-bold text-neutral-200">Project system prompt (high priority)</div>
                <textarea
                  value={projectPrompt}
                  onChange={(e) => setProjectPrompt(e.target.value)}
                  placeholder="This will be applied before the team/agent prompts."
                  rows={10}
                  className="mt-2 w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-xs font-bold text-neutral-200">Assignment</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAssignmentMode('team')}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2',
                      assignmentMode === 'team'
                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                    )}
                  >
                    <Users className="h-4 w-4" />
                    Team
                  </button>
                  <button
                    onClick={() => setAssignmentMode('agent')}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2',
                      assignmentMode === 'agent'
                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                    )}
                  >
                    <Bot className="h-4 w-4" />
                    Agent
                  </button>
                </div>

                {assignmentMode === 'team' ? (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-neutral-200">Team</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a team…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-xs font-semibold text-neutral-500">
                      Team mode will consult sub-agents and synthesize like normal.
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-neutral-200">Agent</label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select an agent…</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-xs font-semibold text-neutral-500">Specific agent mode.</div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

