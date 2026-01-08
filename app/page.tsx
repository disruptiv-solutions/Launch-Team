"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  Users, 
  Search, 
  PenTool, 
  ChevronRight,
  Info,
  ShieldCheck,
  MessageSquare,
  Zap,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Check,
  CheckCircle,
  X,
  Settings,
  XCircle,
  Menu,
  Copy,
  FileText,
  Paperclip,
  File as FileIcon,
  Image as ImageIcon,
  CheckSquare,
  Square,
  X as XIcon,
  Brain,
  Volume2,
  Pencil
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { addMessageToSession } from '@/lib/sessions';
import { DinoRun } from '@/lib/DinoRun';

const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  attachments?: Attachment[];
  consultedAgents?: string[];
  consultingAgents?: string[];
  consultedAgentsCompleted?: string[];
  planText?: string;
  phase?: 'planning' | 'consulting' | 'answering' | 'done';
  audioUrl?: string;
  isStreaming?: boolean;
};

type AgentMemory = {
  id: string;
  agentId: string;
  text: string;
  createdAt?: any;
};

type Attachment = {
  id: string;
  kind: 'image' | 'file';
  name: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  storagePath: string;
};

const MarkdownMessage = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-neutral prose-invert prose-p:leading-relaxed prose-a:no-underline break-words overflow-wrap-anywhere w-full max-w-full" style={{ maxWidth: '100%', wordBreak: 'break-word' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Keep it safe by default: no raw HTML rendering.
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-indigo-400 underline underline-offset-2 hover:text-indigo-300"
            />
          ),
          p: ({ node: _node, ...props }) => <p {...props} className="m-0 leading-relaxed break-words max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} />,
          ul: ({ node: _node, ...props }) => <ul {...props} className="my-2 list-disc pl-6" />,
          ol: ({ node: _node, ...props }) => <ol {...props} className="my-2 list-decimal pl-6" />,
          li: ({ node: _node, ...props }) => <li {...props} className="my-1" />,
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              {...props}
              className="my-2 border-l-4 border-indigo-800 pl-4 text-neutral-300"
            />
          ),
          hr: ({ node: _node, ...props }) => <hr {...props} className="my-4 border-neutral-800" />,
          h1: ({ node: _node, ...props }) => <h1 {...props} className="mb-2 mt-3 text-xl font-extrabold tracking-tight" />,
          h2: ({ node: _node, ...props }) => <h2 {...props} className="mb-2 mt-3 text-lg font-extrabold tracking-tight" />,
          h3: ({ node: _node, ...props }) => <h3 {...props} className="mb-2 mt-3 text-base font-bold tracking-tight" />,
          h4: ({ node: _node, ...props }) => <h4 {...props} className="mb-2 mt-3 text-sm font-bold tracking-tight" />,
          code: ({ node: _node, className, children, ...props }) => {
            const isBlock = typeof className === 'string' && className.includes('language-');
            if (!isBlock) {
              return (
                <code
                  {...props}
                  className={cn(
                    "rounded-md bg-neutral-800 px-1.5 py-0.5 font-mono text-[0.9em] text-neutral-100",
                    className
                  )}
                >
                  {children}
                </code>
              );
            }
            return (
              <code {...props} className={cn("font-mono text-sm", className)}>
                {children}
              </code>
            );
          },
          pre: ({ node: _node, ...props }) => (
            <pre
              {...props}
              className="my-3 overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm leading-relaxed"
            />
          ),
          table: ({ node: _node, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-2xl border border-neutral-800">
              <table {...props} className="w-full border-collapse text-sm" />
            </div>
          ),
          thead: ({ node: _node, ...props }) => <thead {...props} className="bg-neutral-900" />,
          th: ({ node: _node, ...props }) => (
            <th {...props} className="border-b border-neutral-800 px-3 py-2 text-left font-bold" />
          ),
          td: ({ node: _node, ...props }) => (
            <td {...props} className="border-b border-neutral-800 px-3 py-2 align-top" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const formatTimestamp = (ts: any): string => {
  if (!ts) return '';
  if (typeof ts?.toDate === 'function') {
    try {
      return ts.toDate().toLocaleString();
    } catch {
      return '';
    }
  }
  if (typeof ts?.seconds === 'number') {
    return new Date(ts.seconds * 1000).toLocaleString();
  }
  return '';
};

const AgentBadge = ({ name, isActive }: { name: string, isActive?: boolean }) => {
  const isResearcher = name.includes('researcher');
  const isCreative = name.includes('creative');
  const isLead = name.includes('lead');
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300",
      isActive && "ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-950 scale-105",
      isResearcher && "bg-blue-900/30 text-blue-400 border-blue-800",
      isCreative && "bg-purple-900/30 text-purple-400 border-purple-800",
      isLead && "bg-amber-900/30 text-amber-400 border-amber-800",
      (!isResearcher && !isCreative && !isLead) && "bg-neutral-900/30 text-neutral-400 border-neutral-800"
    )}>
      {isResearcher && <Search size={10} />}
      {isCreative && <PenTool size={10} />}
      {(isLead || (!isResearcher && !isCreative)) && <Sparkles size={10} />}
      {name.replace('_agent', '').replace('_', ' ')}
      {isActive && <Activity size={10} className="animate-pulse ml-1" />}
    </div>
  );
};

type Session = {
  id: string;
  title: string;
  teamId?: string;
  messages: Message[];
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
};

const ChatInterface = () => {
  const router = useRouter();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to LaunchHub AI Mission Control. I'm your Chief of Staff. I coordinate specialized agents to solve complex tasks. What's our objective today?",
      agent: 'chief_of_staff'
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  type UploadingAttachment = Attachment & {
    status: 'uploading' | 'ready' | 'error';
    progress: number; // 0..100
    error?: string;
  };
  const [pendingAttachments, setPendingAttachments] = useState<UploadingAttachment[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showTeamConfigModal, setShowTeamConfigModal] = useState(false);
  const [agentMode, setAgentMode] = useState<'all' | 'specific'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('chief_of_staff');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [showSaveDocModal, setShowSaveDocModal] = useState(false);
  const [docToSave, setDocToSave] = useState<{ content: string; agent?: string } | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [suggestedMemories, setSuggestedMemories] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [isSuggestingMemories, setIsSuggestingMemories] = useState<Map<string, boolean>>(new Map());
  const [openMemoryMenuFor, setOpenMemoryMenuFor] = useState<string | null>(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memoryModalData, setMemoryModalData] = useState<{
    messageId: string;
    meaningfulIndex: number;
  } | null>(null);
  const [agentMemoriesByAgentId, setAgentMemoriesByAgentId] = useState<Record<string, AgentMemory[]>>({});
  const [isLoadingAgentMemories, setIsLoadingAgentMemories] = useState(false);
  const [isSavingAgentMemory, setIsSavingAgentMemory] = useState<Map<string, boolean>>(new Map());
  const [isDeletingAgentMemory, setIsDeletingAgentMemory] = useState<Map<string, boolean>>(new Map());
  const [loadingTTSMessageId, setLoadingTTSMessageId] = useState<string | null>(null);
  const [playingTTSMessageId, setPlayingTTSMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // No more memory menu root check
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [showLivePanel, setShowLivePanel] = useState(false);
  const [isDesktopLivePanelCollapsed, setIsDesktopLivePanelCollapsed] = useState(false);
  const [sessionDocuments, setSessionDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryHistory, setSummaryHistory] = useState<any[]>([]);
  const [currentSummaryIndex, setCurrentSummaryIndex] = useState<number>(-1);
  const [detectedTasks, setDetectedTasks] = useState<Map<number, string[]>>(new Map()); // messageIndex -> tasks
  const [sessionTasks, setSessionTasks] = useState<any[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<any[]>([]);
  const [isDetectingTasks, setIsDetectingTasks] = useState<Map<number, boolean>>(new Map());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [selectedTeamForSession, setSelectedTeamForSession] = useState<string>('');
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [showAgentCreationModal, setShowAgentCreationModal] = useState(false);
  const [creatingAgentType, setCreatingAgentType] = useState<'team_lead' | 'sub_agent' | null>(null);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const MAX_IMAGES_PER_MESSAGE = 4;
  const MAX_ATTACHMENTS_PER_MESSAGE = 6;
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
  const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
  const MAX_TOTAL_BYTES = 40 * 1024 * 1024; // 40MB total per message

  const agentOptions = [
    { id: 'chief_of_staff', name: 'Chief of Staff', role: 'Strategic Orchestrator', icon: Bot, color: 'bg-indigo-500' },
    { id: 'fundraising_cash_flow_advisor', name: 'Fundraising & Cash Flow', role: 'Runway + fundraising', icon: Search, color: 'bg-emerald-600' },
    { id: 'gtm_revenue_growth_strategist', name: 'GTM & Revenue Growth', role: 'Sales + conversion', icon: Users, color: 'bg-blue-600' },
    { id: 'product_technical_advisor', name: 'Product & Technical', role: 'Bugs + roadmap + Earl', icon: Bot, color: 'bg-slate-700' },
    { id: 'legal_compliance_advisor', name: 'Legal & Compliance', role: 'LLC + contracts + risk', icon: ShieldCheck, color: 'bg-neutral-700' },
    { id: 'brand_voice_marketing_agent', name: 'Brand Voice & Marketing', role: 'Messaging + copy', icon: Sparkles, color: 'bg-amber-600' },
    { id: 'documentation_knowledge_manager', name: 'Docs & Knowledge', role: 'Guides + FAQs', icon: PenTool, color: 'bg-purple-600' },
    { id: 'community_engagement_manager', name: 'Community & Engagement', role: 'Retention + feed', icon: Activity, color: 'bg-pink-600' },
    { id: 'founder_wellbeing_advisor', name: 'Founder Wellbeing', role: 'Sustainability', icon: Activity, color: 'bg-rose-600' },
    { id: 'operations_scaling_advisor', name: 'Ops & Scaling', role: 'Systems (defer)', icon: Users, color: 'bg-cyan-700' },
    { id: 'gbeta_program_specialist', name: 'gBETA Specialist', role: 'Feb–Apr only', icon: Info, color: 'bg-indigo-700' },
  ];

  const getAgentDisplayName = (agentId?: string | null) => {
    if (!agentId) return '';
    return (
      allAgents.find((a) => a.id === agentId)?.name ||
      agentOptions.find((a) => a.id === agentId)?.name ||
      agentId
    );
  };

  const getAgentDisplayRole = (agentId?: string | null) => {
    if (!agentId) return '';
    return (
      allAgents.find((a) => a.id === agentId)?.description ||
      agentOptions.find((a) => a.id === agentId)?.role ||
      ''
    );
  };

  const isAllowedContentType = (contentType: string) => {
    const allowed = new Set<string>([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword', // doc (limited support)
    ]);
    return allowed.has(contentType);
  };

  const sanitizeFileName = (name: string) => {
    const base = name.trim().replace(/[^\w.\-() ]+/g, '_');
    return base.length > 120 ? base.slice(0, 120) : base;
  };

  const getAttachmentCounts = (items: { kind: 'image' | 'file'; sizeBytes: number; status?: string }[]) => {
    const images = items.filter((a) => a.kind === 'image').length;
    const total = items.length;
    const totalBytes = items.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    return { images, total, totalBytes };
  };

  const ensureSessionForUploads = async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;

    if (!currentTeamId) {
      setShowTeamSelectionModal(true);
      return null;
    }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Session',
          teamId: currentTeamId,
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const created = data.session;
      if (!created?.id) return null;

      setCurrentSessionId(created.id);
      setSessions((prev) => [created, ...prev]);
      return created.id as string;
    } catch (error) {
      console.error('Error creating session for uploads:', error);
      return null;
    }
  };

  const updatePendingAttachment = (id: string, patch: Partial<UploadingAttachment>) => {
    setPendingAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const handleSelectAttachments = () => {
    attachmentInputRef.current?.click();
  };

  const handleIncomingFiles = async (incoming: File[]) => {
    try {
      if (!incoming || incoming.length === 0) return;
      const invalid = incoming.filter((f) => !isAllowedContentType(f.type));
      if (invalid.length > 0) {
        alert(`Unsupported file type(s): ${invalid.map((f) => f.name).join(', ')}`);
        return;
      }

      const sessionId = await ensureSessionForUploads();
      if (!sessionId) return;

      const existingCounts = getAttachmentCounts(pendingAttachments);
      const incomingItems = incoming.map((f) => ({
        kind: f.type.startsWith('image/') ? ('image' as const) : ('file' as const),
        sizeBytes: f.size,
      }));
      const incomingCounts = getAttachmentCounts(incomingItems);
      const nextImages = existingCounts.images + incomingCounts.images;
      const nextTotal = existingCounts.total + incomingCounts.total;
      const nextBytes = existingCounts.totalBytes + incomingCounts.totalBytes;

      if (nextImages > MAX_IMAGES_PER_MESSAGE) {
        alert(`Max ${MAX_IMAGES_PER_MESSAGE} images per message.`);
        return;
      }
      if (nextTotal > MAX_ATTACHMENTS_PER_MESSAGE) {
        alert(`Max ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message.`);
        return;
      }
      if (nextBytes > MAX_TOTAL_BYTES) {
        alert(`Attachments too large. Max total ${(MAX_TOTAL_BYTES / (1024 * 1024)).toFixed(0)}MB per message.`);
        return;
      }

      for (const file of incoming) {
        const kind: 'image' | 'file' = file.type.startsWith('image/') ? 'image' : 'file';
        const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
        if (file.size > maxBytes) {
          alert(`${file.name} is too large. Max ${(maxBytes / (1024 * 1024)).toFixed(0)}MB.`);
          continue;
        }

        const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const safeName = sanitizeFileName(file.name);
        const storagePath = `sessions/${sessionId}/attachments/${id}_${safeName}`;

        const placeholder: UploadingAttachment = {
          id,
          kind,
          name: safeName,
          contentType: file.type,
          sizeBytes: file.size,
          url: '',
          storagePath,
          status: 'uploading',
          progress: 0,
        };

        setPendingAttachments((prev) => [...prev, placeholder]);

        const ref = storageRef(storage, storagePath);
        const task = uploadBytesResumable(ref, file, { contentType: file.type });

        await new Promise<void>((resolve) => {
          task.on(
            'state_changed',
            (snap) => {
              const pct = snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
              updatePendingAttachment(id, { progress: pct });
            },
            (err) => {
              updatePendingAttachment(id, { status: 'error', error: err?.message || 'Upload failed' });
              resolve();
            },
            async () => {
              try {
                const url = await getDownloadURL(task.snapshot.ref);
                updatePendingAttachment(id, { status: 'ready', progress: 100, url });
              } catch (err: any) {
                updatePendingAttachment(id, { status: 'error', error: err?.message || 'Failed to get URL' });
              } finally {
                resolve();
              }
            }
          );
        });
      }
    } finally {
      // no-op
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    try {
      if (!files || files.length === 0) return;
      await handleIncomingFiles(Array.from(files));
    } finally {
      // Allow re-selecting the same file(s)
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    if (items.length === 0) return;

    const pastedFiles = items
      .map((item) => item.getAsFile())
      .filter((f): f is File => Boolean(f))
      .filter((f) => f.type.startsWith('image/'));

    if (pastedFiles.length === 0) return;

    // Don't block text paste; just also ingest image(s) from clipboard.
    void handleIncomingFiles(pastedFiles).catch((error) => {
      console.error('Failed to ingest pasted image:', error);
    });
  };

  const handleRemovePendingAttachment = async (id: string) => {
    const target = pendingAttachments.find((a) => a.id === id);
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));

    if (!target?.storagePath) return;
    try {
      // Best-effort cleanup for already-uploaded files.
      if (target.status === 'ready') {
        await deleteObject(storageRef(storage, target.storagePath));
      }
    } catch (error) {
      console.warn('Failed to delete attachment from storage:', error);
    }
  };

  // Default prompts mapping (fallback if Firestore doesn't have a custom prompt)
  const defaultPrompts: Record<string, string> = {
    chief_of_staff: `You are Ian McDonald's Chief of Staff AI, the primary interface for managing his business, LaunchBox. Your role is to reduce overwhelm, enforce priorities, and route complex questions to specialized sub-assistants.

Core identity: You serve a solo technical founder running a pre-seed SaaS business with tight cash constraints and multiple competing priorities. Ian has ADHD and gets overwhelmed easily. Your job is to provide clarity, not add complexity.

You MUST:
- Triage every request into a thread + tier (Survive/Sell/Build/Raise/Legitimize/Scale).
- Keep responses concise and action-oriented.
- Route to the appropriate specialist agent via handoff when needed.
- When missing critical details, ask at most 1–2 clarifying questions, then proceed with best-effort.

Important dates:
- White label launch: Jan 10, 2026
- gBETA application deadline: Feb 15, 2026

North star goal: $10K MRR by June 2026.

Priority stack:
Tier 1: SURVIVE (runway/cash)
Tier 2: SELL (white label + conversion)
Tier 3: LEGITIMIZE (LLC + contracts + IP)
Tier 4: RAISE (gBETA + F&F)
Tier 5: SCALE (systems/hiring; mostly defer until $5K MRR)`,
    fundraising_cash_flow_advisor: `You are Ian's financial strategist, focused on ensuring he doesn't run out of money and successfully navigates Friends & Family → gBETA → potential Seed funding pathway.

Scope: Thread 1 (SURVIVE) and Thread 4 (RAISE).

Rules:
- Always show the numbers (burn, runway, target, next action).
- Be direct, realistic, and time-aware.
- Provide drafts/templates when asked (e.g., investor outreach email).
- If a question is legal (contracts, entity formation specifics), say you're not a lawyer and suggest consulting Legal & Compliance Advisor / a real attorney.`,
    gtm_revenue_growth_strategist: `You are Ian's sales and marketing strategist, focused on one goal: Growing MRR from $410 to $10K by June 2026.

Scope: Thread 3 (SELL).

Rules:
- Tie recommendations directly to conversion + MRR impact.
- Prefer simple, testable experiments (email sequence, workshop pitch, call script).
- Provide concrete copy and scripts, not generic advice.
- Coordinate with Brand Voice & Marketing when messaging matters.`,
    product_technical_advisor: `You are Ian's product and technical strategist, helping him prioritize what to build, when to fix bugs, and how to manage Earl (contractor developer).

Scope: Thread 2 (BUILD).

Rules:
- Stability > shiny features during launch windows.
- Use a severity framework (P0–P3) for bugs.
- For any feature request, evaluate: revenue impact, user demand, effort, tier alignment.
- Provide an actionable next step (what Ian does today / what Earl does this sprint).`,
    legal_compliance_advisor: `You are Ian's legal and compliance strategist, helping him operate LaunchBox legitimately and minimize legal risk.

Scope: Thread 5 (LEGITIMIZE).

Rules:
- You are NOT a lawyer. Provide general guidance + templates + checklists.
- Focus on essentials first: LLC, contracts, IP assignment (Earl), ToS/Privacy.
- Keep advice practical, not paranoid.`,
    brand_voice_marketing_agent: `You are Ian's brand and messaging strategist, ensuring consistent voice across all channels and creating high-converting marketing copy.

Rules:
- Honest > polished. Practical > visionary. Proven > promised.
- Avoid corporate buzzwords and fake urgency.
- Lead with outcomes + proof (numbers/screenshots/testimonials).
- If competitor context is needed, use web search sparingly and cite sources.`,
    documentation_knowledge_manager: `You are Ian's documentation strategist, creating clear, user-friendly guides that scale customer success and reduce support burden.

Rules:
- Write in clear, step-by-step checklists.
- Be ADHD-friendly: short paragraphs, headings, bullets.
- Produce user docs, operator playbooks, FAQs, troubleshooting, and tutorial scripts.`,
    community_engagement_manager: `You are Ian's community strategist focused on driving engagement, retention, and repeat usage.

Rules:
- Engagement = retention = revenue.
- Provide weekly prompt calendars, onboarding sequences, and playbooks for white-label operators.
- Keep it practical and easy to run as a solo founder.`,
    founder_wellbeing_advisor: `You are Ian's wellbeing and sustainability advisor. Your job is to prevent burnout and keep him operating at a sustainable pace.

Rules:
- Energy management > time management (ADHD-friendly).
- If burnout signals appear, recommend workload cuts and rest.
- You are not a therapist; if crisis signals appear, recommend professional help and appropriate resources.`,
    operations_scaling_advisor: `You are Ian's operations and systems strategist. CRITICAL: your default is to DEFER most scaling work until $5K+ MRR.

Rules:
- Prevent premature scaling.
- Provide temporary manual workflows instead of automation.
- Only recommend hiring when revenue can support it and pain threshold is met.`,
    gbeta_program_specialist: `You are Ian's gBETA program specialist.

Active window: Feb 1–Apr 24, 2026 only. If asked outside this window, respond that you're inactive and route back to Chief of Staff.

Rules:
- Help with application answers, pitch practice, mentor swarm filtering, and post-program follow-through.
- Keep deliverables concise, specific, and aligned to traction.`,
  };

  const handleEditAgentPrompt = async (agentId: string) => {
    try {
      // Normalize agentId - remove special characters and collapse multiple underscores
      const normalizeId = (id: string) => {
        return id.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .replace(/_+/g, '_') // Collapse multiple underscores to single
          .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
      };
      
      const normalizedId = normalizeId(agentId);
      let foundAgentId = normalizedId;
      let currentPrompt = '';
      let agentName = '';
      
      // Try multiple ID variations
      const idVariations = [
        normalizedId,
        agentId, // Original ID
        normalizeId(agentId.replace(/_+/g, '_')), // Collapsed original
      ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
      
      // Try each ID variation
      for (const testId of idVariations) {
        const agentsResponse = await fetch(`/api/agents?agentId=${encodeURIComponent(testId)}`);
        if (agentsResponse.ok) {
          const agentsData = await agentsResponse.json();
          if (agentsData.agent) {
            currentPrompt = agentsData.agent.systemPrompt || '';
            agentName = agentsData.agent.name || '';
            foundAgentId = testId; // Use the ID that actually exists
            break;
          }
        }
      }
      
      // Fallback to old system if not found in new system
      if (!currentPrompt) {
        const response = await fetch(`/api/agent-prompts?agentId=${encodeURIComponent(agentId)}`);
        if (response.ok) {
          const data = await response.json();
          currentPrompt = data.prompt || defaultPrompts[agentId] || '';
        } else {
          currentPrompt = defaultPrompts[agentId] || '';
        }
      }
      
      setEditingAgentId(foundAgentId); // Use the ID that exists (or normalized if creating new)
      setEditingPrompt(currentPrompt);
      setShowPromptEditor(true);
    } catch (error) {
      console.error('Error loading agent prompt:', error);
      // Fallback to default prompt
      const normalizedId = agentId.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setEditingAgentId(normalizedId);
      setEditingPrompt(defaultPrompts[agentId] || '');
      setShowPromptEditor(true);
    }
  };

  const handleSavePrompt = async () => {
    if (!editingAgentId || !editingPrompt.trim()) return;
    
    try {
      setIsSavingPrompt(true);
      
      // Normalize ID for lookup
      const normalizeId = (id: string) => {
        return id.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
      };
      
      const normalizedId = normalizeId(editingAgentId);
      
      // Try to find agent with normalized ID or original ID
      const idVariations = [
        normalizedId,
        editingAgentId,
      ].filter((id, index, arr) => arr.indexOf(id) === index);
      
      let agentExists = false;
      let existingAgent = null;
      let foundAgentId = normalizedId;
      
      // Check each ID variation
      for (const testId of idVariations) {
        const agentResponse = await fetch(`/api/agents?agentId=${encodeURIComponent(testId)}`);
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          if (agentData.agent) {
            agentExists = true;
            existingAgent = agentData.agent;
            foundAgentId = testId; // Use the ID that actually exists
            break;
          }
        }
      }
      
      if (agentExists && existingAgent) {
        // Update existing agent in new system
        const updateResponse = await fetch('/api/agents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: foundAgentId,
            systemPrompt: editingPrompt,
          }),
        });
        
        if (updateResponse.ok) {
          // Reload agents list to refresh UI
          await reloadAgents();
          setShowPromptEditor(false);
          setEditingAgentId(null);
          setEditingPrompt('');
          alert('Prompt saved successfully!');
          return;
        } else {
          const errorData = await updateResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to update agent');
        }
      } else {
        // Agent doesn't exist in new system - try to create it or use old system
        // First, try to find agent info from the sidebar list (try both normalized and original ID)
        const agentInfo = agentOptions.find(a => 
          normalizeId(a.id) === normalizedId || a.id === editingAgentId || a.id === normalizedId
        );
        
        if (agentInfo) {
          // Create new agent in the new system (will use normalized ID from name)
          const createResponse = await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: agentInfo.name,
              systemPrompt: editingPrompt,
              agentType: normalizedId === 'chief_of_staff' ? 'team_lead' : 'sub_agent',
              description: agentInfo.role,
            }),
          });
          
          if (createResponse.ok) {
            // Reload agents list
            await reloadAgents();
            setShowPromptEditor(false);
            setEditingAgentId(null);
            setEditingPrompt('');
            alert('Prompt saved successfully!');
            return;
          } else {
            const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to create agent:', errorData);
            // Continue to fallback
          }
        }
        
        // Fallback to old system
        const response = await fetch('/api/agent-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: normalizedId,
            prompt: editingPrompt,
          }),
        });
        
        if (response.ok) {
          setShowPromptEditor(false);
          setEditingAgentId(null);
          setEditingPrompt('');
          alert('Prompt saved successfully!');
        } else {
          throw new Error('Failed to save prompt');
        }
      }
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      alert(`Failed to save prompt: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  useEffect(() => {
    if (!showPromptEditor || !editingAgentId) return;
    loadAgentMemories(editingAgentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPromptEditor, editingAgentId]);

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSaveToDocs = (content: string, agent?: string) => {
    setDocToSave({ content, agent });
    setDocTitle('');
    setShowSaveDocModal(true);
  };

  const handleSaveDocument = async () => {
    if (!docToSave || !docTitle.trim()) return;
    
    try {
      setIsSavingDoc(true);
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          content: docToSave.content,
          sessionId: currentSessionId,
          agent: docToSave.agent,
        }),
      });
      
      if (response.ok) {
        setShowSaveDocModal(false);
        setDocToSave(null);
        setDocTitle('');
        // Reload session documents after saving
        if (currentSessionId) {
          loadSessionDocuments();
        }
        alert('Document saved successfully!');
      } else {
        throw new Error('Failed to save document');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Failed to save document. Please try again.');
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadTeams = async () => {
    try {
      setIsLoadingTeams(true);
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        const teamsList = data.teams || [];
        
        // If no teams exist, run migration to create default team
        if (teamsList.length === 0) {
          try {
            const migrateResponse = await fetch('/api/migrate', { method: 'POST' });
            if (migrateResponse.ok) {
              // Reload teams after migration
              const reloadResponse = await fetch('/api/teams');
              if (reloadResponse.ok) {
                const reloadData = await reloadResponse.json();
                const newTeamsList = reloadData.teams || [];
                setTeams(newTeamsList);
                if (newTeamsList.length > 0) {
                  setCurrentTeamId(newTeamsList[0].id);
                }
              }
            }
          } catch (migrateError) {
            console.error('Migration error:', migrateError);
          }
        } else {
          setTeams(teamsList);
          // Set default team if none selected
          if (!currentTeamId && teamsList.length > 0) {
            setCurrentTeamId(teamsList[0].id);
          }
        }
        
        // Load agents for team management
        const agentsResponse = await fetch('/api/agents');
        if (agentsResponse.ok) {
          const agentsData = await agentsResponse.json();
          setAllAgents(agentsData.agents || []);
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  // Load teams on mount
  useEffect(() => {
    loadTeams();
  }, []);

  const reloadAgents = async () => {
    try {
      const agentsResponse = await fetch('/api/agents');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAllAgents(agentsData.agents || []);
      }
    } catch (error) {
      console.error('Error reloading agents:', error);
    }
  };

  // Load documents for current session
  useEffect(() => {
    if (currentSessionId) {
      loadSessionDocuments();
      loadSummaryHistory();
      loadSessionTasks();
    } else {
      setSessionDocuments([]);
      setSummaryHistory([]);
      setCurrentSummaryIndex(-1);
      setConversationSummary('');
      setSessionTasks([]);
      setArchivedTasks([]);
    }
  }, [currentSessionId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        
        // If no current session and sessions exist, load the most recent one
        if (!currentSessionId && data.sessions?.length > 0) {
          loadSession(data.sessions[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadSessionDocuments = async () => {
    if (!currentSessionId) return;
    
    try {
      setIsLoadingDocuments(true);
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        // Filter documents by current session ID
        const filtered = (data.documents || []).filter((doc: any) => doc.sessionId === currentSessionId);
        setSessionDocuments(filtered);
      }
    } catch (error) {
      console.error('Error loading session documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const loadSummaryHistory = async () => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`/api/summaries?sessionId=${currentSessionId}`);
      if (response.ok) {
        const data = await response.json();
        const summaries = data.summaries || [];
        setSummaryHistory(summaries);
        // Set current summary to the latest one
        if (summaries.length > 0) {
          setCurrentSummaryIndex(summaries.length - 1);
          setConversationSummary(summaries[summaries.length - 1].summary);
        } else {
          setCurrentSummaryIndex(-1);
        }
      }
    } catch (error) {
      console.error('Error loading summary history:', error);
    }
  };

  const navigateSummary = (direction: 'prev' | 'next') => {
    if (summaryHistory.length === 0) return;
    
    let newIndex = currentSummaryIndex;
    if (direction === 'prev' && currentSummaryIndex > 0) {
      newIndex = currentSummaryIndex - 1;
    } else if (direction === 'next' && currentSummaryIndex < summaryHistory.length - 1) {
      newIndex = currentSummaryIndex + 1;
    }
    
    if (newIndex !== currentSummaryIndex && newIndex >= 0 && newIndex < summaryHistory.length) {
      setCurrentSummaryIndex(newIndex);
      const summary = summaryHistory[newIndex];
      setConversationSummary(summary.summary);
      
      // Scroll to the message at this summary's messageIndex
      scrollToMessage(summary.messageIndex);
    }
  };

  const scrollToMessage = (messageIndex: number) => {
    const messageElement = messageRefs.current.get(messageIndex);
    if (messageElement && scrollRef.current) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.classList.add('ring-2', 'ring-indigo-500', 'ring-opacity-50');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-opacity-50');
      }, 2000);
    }
  };

  const loadSessionTasks = async () => {
    if (!currentSessionId) return;
    
    try {
      const [activeResponse, archivedResponse] = await Promise.all([
        fetch(`/api/tasks?sessionId=${currentSessionId}&includeArchived=false`),
        fetch(`/api/tasks?sessionId=${currentSessionId}&includeArchived=true`),
      ]);
      
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setSessionTasks(activeData.tasks || []);
      }
      
      if (archivedResponse.ok) {
        const archivedData = await archivedResponse.json();
        setArchivedTasks(archivedData.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const detectTasks = async (messageContent: string, messageIndex: number) => {
    if (!messageContent || messageContent.trim().length < 20) return; // Skip very short messages
    
    try {
      setIsDetectingTasks(prev => new Map(prev).set(messageIndex, true));
      const response = await fetch('/api/detect-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const tasks = data.tasks || [];
        if (tasks.length > 0) {
          setDetectedTasks(prev => {
            const newMap = new Map(prev);
            newMap.set(messageIndex, tasks);
            return newMap;
          });
        }
      }
    } catch (error) {
      console.error('Error detecting tasks:', error);
    } finally {
      setIsDetectingTasks(prev => {
        const newMap = new Map(prev);
        newMap.set(messageIndex, false);
        return newMap;
      });
    }
  };

  const suggestMemoriesForMessage = async (params: {
    messageIndex: number;
    messageId: string;
    assistantMessage: Message;
    conversationSnippet: string;
  }) => {
    const assistantFinalText = params.assistantMessage.content;
    if (!assistantFinalText || assistantFinalText.trim().length < 20) return;

    const agentIdsRaw = [
      ...(Array.isArray(params.assistantMessage.consultedAgents) ? params.assistantMessage.consultedAgents : []),
      ...(typeof params.assistantMessage.agent === 'string' ? [params.assistantMessage.agent] : []),
    ];
    const agentIds = Array.from(new Set(agentIdsRaw.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim())));
    if (agentIds.length === 0) return;

    setIsSuggestingMemories((prev) => new Map(prev).set(params.messageId, true));

    try {
      const results = await Promise.all(
        agentIds.map(async (agentId) => {
          const response = await fetch('/api/suggest-memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId,
              agentName: getAgentDisplayName(agentId) || agentId,
              conversationSnippet: params.conversationSnippet,
              assistantFinalText,
            }),
          });

          if (!response.ok) return { agentId, suggestions: [] as string[] };
          const data = await response.json();
          const suggestions = Array.isArray(data.suggestions)
            ? data.suggestions.filter((s: any) => typeof s === 'string' && s.trim())
            : [];
          return { agentId, suggestions };
        })
      );

      setSuggestedMemories((prev) => {
        const next = { ...prev };
        const byAgent: Record<string, string[]> = { ...(next[params.messageId] ?? {}) };
        for (const r of results) {
          byAgent[r.agentId] = r.suggestions;
        }
        next[params.messageId] = byAgent;
        return next;
      });
    } catch (error) {
      console.error('Error suggesting memories:', error);
    } finally {
      setIsSuggestingMemories((prev) => {
        const next = new Map(prev);
        next.set(params.messageId, false);
        return next;
      });
    }
  };

  const handleAddMemoryToAgent = async (params: {
    agentId: string;
    text: string;
    messageId: string;
  }) => {
    if (!params.text.trim()) return;

    try {
      const response = await fetch('/api/agent-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: params.agentId,
          text: params.text.trim(),
          source: {
            sessionId: currentSessionId || undefined,
            messageId: params.messageId,
          },
        }),
      });

      if (!response.ok) return;

      setSuggestedMemories((prev) => {
        const next = { ...prev };
        const byAgent = { ...(next[params.messageId] ?? {}) };
        const existing = Array.isArray(byAgent[params.agentId]) ? byAgent[params.agentId] : [];
        byAgent[params.agentId] = existing.filter((s) => s !== params.text);
        next[params.messageId] = byAgent;
        return next;
      });
    } catch (error) {
      console.error('Error saving agent memory:', error);
    }
  };

  const loadAgentMemories = async (agentId: string) => {
    try {
      setIsLoadingAgentMemories(true);
      const response = await fetch(`/api/agent-memories?agentId=${encodeURIComponent(agentId)}`);
      if (!response.ok) return;
      const data = await response.json();
      const memories = Array.isArray(data.memories) ? data.memories : [];

      setAgentMemoriesByAgentId((prev) => ({
        ...prev,
        [agentId]: memories,
      }));
    } catch (error) {
      console.error('Error loading agent memories:', error);
    } finally {
      setIsLoadingAgentMemories(false);
    }
  };

  const handleUpdateAgentMemory = async (params: { memoryId: string; agentId: string; text: string }) => {
    if (!params.text.trim()) return;

    setIsSavingAgentMemory((prev) => new Map(prev).set(params.memoryId, true));
    try {
      const response = await fetch('/api/agent-memories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: params.memoryId, text: params.text.trim() }),
      });
      if (!response.ok) return;

      await loadAgentMemories(params.agentId);
    } catch (error) {
      console.error('Error updating agent memory:', error);
    } finally {
      setIsSavingAgentMemory((prev) => {
        const next = new Map(prev);
        next.set(params.memoryId, false);
        return next;
      });
    }
  };

  const handleDeleteAgentMemory = async (params: { memoryId: string; agentId: string }) => {
    setIsDeletingAgentMemory((prev) => new Map(prev).set(params.memoryId, true));
    try {
      const response = await fetch(`/api/agent-memories?memoryId=${encodeURIComponent(params.memoryId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) return;

      await loadAgentMemories(params.agentId);
    } catch (error) {
      console.error('Error deleting agent memory:', error);
    } finally {
      setIsDeletingAgentMemory((prev) => {
        const next = new Map(prev);
        next.set(params.memoryId, false);
        return next;
      });
    }
  };

  const handleEditMessage = (index: number) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'user') return;
    
    setInput(msg.content);
    setEditingMessageIndex(index);

    // Restore attachments
    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      const restored = msg.attachments.map(att => ({
        ...att,
        status: 'ready' as const,
        progress: 100,
      }));
      setPendingAttachments(restored);
    } else {
      setPendingAttachments([]);
    }
    
    // Focus the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cancelEdit = () => {
    setEditingMessageIndex(null);
    setInput('');
    setPendingAttachments([]);
  };

  const handleTextToSpeech = async (msg: Message, index: number) => {
    const messageId = `msg-${index}`;
    
    // If already playing this message, stop it
    if (playingTTSMessageId === messageId) {
      audioRef.current?.pause();
      setPlayingTTSMessageId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingTTSMessageId(null);
    }

    try {
      let audioUrl = msg.audioUrl;

      if (!audioUrl) {
        setLoadingTTSMessageId(messageId);
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: msg.content,
            sessionId: currentSessionId,
            messageIndex: index,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate speech');
        const data = await response.json();
        audioUrl = data.audioUrl;

        // Update local messages state with the new audioUrl
        setMessages(prev => {
          const next = [...prev];
          if (next[index]) {
            next[index] = { ...next[index], audioUrl };
          }
          return next;
        });
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onplay = () => setPlayingTTSMessageId(messageId);
        audio.onended = () => setPlayingTTSMessageId(null);
        audio.onerror = () => {
          setPlayingTTSMessageId(null);
          alert('Failed to play audio');
        };
        
        setLoadingTTSMessageId(null);
        audio.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setLoadingTTSMessageId(null);
      alert('Error generating or playing speech');
    }
  };

  const saveTask = async (task: string, messageIndex: number) => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          task,
          messageIndex,
        }),
      });
      
      if (response.ok) {
        // Remove from detected tasks
        setDetectedTasks(prev => {
          const newMap = new Map(prev);
          const tasks = newMap.get(messageIndex) || [];
          newMap.set(messageIndex, tasks.filter(t => t !== task));
          return newMap;
        });
        // Reload tasks
        await loadSessionTasks();
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          completed,
          archived: completed, // Archive when completed, unarchive when unchecked
        }),
      });
      
      if (response.ok) {
        await loadSessionTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!currentSessionId) {
      alert('Please select or create a session first.');
      return;
    }

    const taskName = newTaskName.trim();
    if (!taskName) return;

    try {
      setIsCreatingTask(true);
      const description = newTaskDescription.trim();

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          task: taskName,
          description: description ? description : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create task' }));
        throw new Error(errorData.error || 'Failed to create task');
      }

      setShowTaskModal(false);
      setNewTaskName('');
      setNewTaskDescription('');
      await loadSessionTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const dismissTask = (messageIndex: number, task: string) => {
    setDetectedTasks(prev => {
      const newMap = new Map(prev);
      const tasks = newMap.get(messageIndex) || [];
      newMap.set(messageIndex, tasks.filter(t => t !== task));
      if (newMap.get(messageIndex)?.length === 0) {
        newMap.delete(messageIndex);
      }
      return newMap;
    });
  };

  const generateSummary = async (messagesToSummarize: Message[]) => {
    // Only generate summary if there are at least 2 messages (user + assistant)
    const meaningfulMessages = messagesToSummarize.filter(m => 
      m.content && m.content.trim() && !m.isStreaming
    );
    
    if (meaningfulMessages.length < 2) {
      setConversationSummary('');
      return;
    }

    try {
      setIsGeneratingSummary(true);
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: meaningfulMessages,
          currentSummary: currentSummaryIndex >= 0 && summaryHistory.length > 0 
            ? summaryHistory[currentSummaryIndex]?.summary 
            : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSummary = data.summary || '';
        setConversationSummary(newSummary);
        
        // Save summary to Firestore
        if (currentSessionId && newSummary) {
          const meaningfulMessages = messagesToSummarize.filter(m => 
            m.content && m.content.trim() && !m.isStreaming
          );
          const messageIndex = meaningfulMessages.length - 1;
          
          const saveResponse = await fetch('/api/summaries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: currentSessionId,
              summary: newSummary,
              messageIndex: messageIndex,
            }),
          });
          
          if (saveResponse.ok) {
            // Reload summary history
            await loadSummaryHistory();
          }
        }
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const createNewSession = async (teamId?: string) => {
    try {
      const sessionTeamId = teamId || selectedTeamForSession;
      if (!sessionTeamId) {
        // Show team selection modal if no team is selected
        setShowTeamSelectionModal(true);
        return;
      }
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `Session ${new Date().toLocaleDateString()}`,
          teamId: sessionTeamId,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const newSession = data.session;
        setSessions((prev) => [newSession, ...prev]);
        // Ensure UI + chat routing are aligned to the newly created session's team
        setCurrentTeamId(sessionTeamId);
        loadSession(newSession.id);
        setShowTeamSelectionModal(false);
        setSelectedTeamForSession('');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleCreateSessionWithTeam = () => {
    if (!selectedTeamForSession) {
      alert('Please select a team');
      return;
    }
    // New sessions should always start with a deliberate team choice
    setCurrentTeamId(selectedTeamForSession);
    createNewSession(selectedTeamForSession);
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        const session = data.session;
        if (session) {
          // Critical: keep the selected team in sync with the session you're viewing
          if (session.teamId) {
            setCurrentTeamId(session.teamId);
          }

          if (!session.messages) {
            setMessages([{
              role: 'assistant',
              content: "Welcome to LaunchHub AI Mission Control. I'm your Chief of Staff. I coordinate specialized agents to solve complex tasks. What's our objective today?",
              agent: 'chief_of_staff'
            }]);
            setConversationSummary('');
            setCurrentSessionId(sessionId);
            return;
          }

          // Convert Firestore Timestamps to plain objects for display
          const formattedMessages: Message[] = session.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            agent: m.agent,
            planText: typeof m.planText === 'string' ? m.planText : undefined,
            consultedAgents: Array.isArray(m.consultedAgents) ? m.consultedAgents : undefined,
            audioUrl: typeof m.audioUrl === 'string' ? m.audioUrl : undefined,
            attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
          }));
          
          // If no messages, show welcome message
          if (formattedMessages.length === 0) {
            setMessages([{
              role: 'assistant',
              content: "Welcome to LaunchHub AI Mission Control. I'm your Chief of Staff. I coordinate specialized agents to solve complex tasks. What's our objective today?",
              agent: 'chief_of_staff'
            }]);
            setConversationSummary('');
          } else {
            setMessages(formattedMessages);
          }
          setCurrentSessionId(sessionId);
          // Summary history will be loaded by the useEffect hook
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session? This cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          // If deleted current session, create a new one or load the next one
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            loadSession(remaining[0].id);
          } else {
            createNewSession();
          }
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const startEditingTitle = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveSessionTitle = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle }),
      });
      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: editingTitle } : s))
        );
        setEditingSessionId(null);
      }
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) return;

    const hasUploading = pendingAttachments.some((a) => a.status === 'uploading');
    if (hasUploading) {
      alert('Please wait for attachments to finish uploading before sending.');
      return;
    }

    const readyAttachments = pendingAttachments
      .filter((a) => a.status === 'ready')
      .map(({ status: _status, progress: _progress, error: _error, ...att }) => att);

    const nextText = input.trim();
    const hasContentToSend = nextText.length > 0 || readyAttachments.length > 0;
    if (!hasContentToSend) return;

    const isEditing = editingMessageIndex !== null;
    const targetIndex = isEditing ? editingMessageIndex : messages.length;

    // Rollback logic for editing
    let currentMessages = [...messages];
    if (isEditing) {
      // Keep only messages before the one we are editing
      currentMessages = currentMessages.slice(0, targetIndex);
    } else {
      // Filter out any streaming messages if we are not editing
      currentMessages = currentMessages.filter(m => !m.isStreaming);
    }

    const userMessage: Message = {
      role: 'user',
      content: nextText,
      ...(readyAttachments.length > 0 ? { attachments: readyAttachments } : {}),
    };

    const nextMessages = [...currentMessages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setPendingAttachments([]);
    setEditingMessageIndex(null);
    setIsLoading(true);

    // Set initial active agent based on mode
    if (agentMode === 'specific' && selectedAgentId) {
      setActiveAgent(selectedAgentId);
    } else {
      setActiveAgent('chief_of_staff'); // Start with Chief of Staff for hierarchical mode
    }

    try {
      // If no session exists, create one first
      let sessionIdToUse = currentSessionId;
      if (!sessionIdToUse) {
        // Require a team for any new conversation started via typing
        if (!currentTeamId) {
          setShowTeamSelectionModal(true);
          setIsLoading(false);
          setActiveAgent(null);
          return;
        }

        const createResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:
              userMessage.content.slice(0, 50) ||
              userMessage.attachments?.[0]?.name ||
              'New Session',
            teamId: currentTeamId,
          }),
        });
        if (createResponse.ok) {
          const data = await createResponse.json();
          sessionIdToUse = data.session.id;
          setCurrentSessionId(sessionIdToUse);
          setSessions((prev) => [data.session, ...prev]);
        }
      }

      if (sessionIdToUse && isEditing) {
        // If editing, overwrite the session messages with the rolled-back set
        await fetch(`/api/sessions?sessionId=${sessionIdToUse}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextMessages }),
        });
      } else if (sessionIdToUse) {
        // Otherwise just add the new message normally
        await addMessageToSession(sessionIdToUse, userMessage);
      }

      const sessionTeamId =
        sessions.find((s) => s.id === sessionIdToUse)?.teamId || currentTeamId;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: nextMessages,
          sessionId: sessionIdToUse,
          agentMode: agentMode,
          selectedAgentId: agentMode === 'specific' ? selectedAgentId : null,
          // In hierarchical mode, ALWAYS route through the session's assigned team
          teamId: agentMode === 'all' ? sessionTeamId : null,
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let currentAgent = 'chief_of_staff';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          agent: currentAgent,
          consultedAgents: [],
          consultingAgents: [],
          consultedAgentsCompleted: [],
          phase: 'planning',
          isStreaming: true,
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) throw new Error(data.error);

              if (data.author && data.author !== currentAgent) {
                currentAgent = data.author;
                setActiveAgent(currentAgent);
              }

              if (typeof data.phase === 'string') {
                const nextPhase = data.phase as any;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
                    lastMessage.phase = nextPhase;
                    lastMessage.agent = currentAgent;
                  }
                  return newMessages;
                });
              }

              if (typeof data.planText === 'string') {
                const nextPlan = data.planText;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
                    lastMessage.planText = nextPlan;
                    lastMessage.agent = currentAgent;
                  }
                  return newMessages;
                });
              }

              if (Array.isArray(data.consultedAgents)) {
                const consulted = data.consultedAgents.filter((v: any) => typeof v === 'string');
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
                    lastMessage.consultedAgents = consulted;
                    lastMessage.agent = currentAgent;
                  }
                  return newMessages;
                });
              }

              if (typeof data.consultingAgent === 'string' && typeof data.consultingStatus === 'string') {
                const consultingAgentId = data.consultingAgent;
                const consultingStatus = data.consultingStatus;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.isStreaming) return newMessages;

                  const currentInProgress = Array.isArray(lastMessage.consultingAgents)
                    ? lastMessage.consultingAgents
                    : [];
                  const currentCompleted = Array.isArray(lastMessage.consultedAgentsCompleted)
                    ? lastMessage.consultedAgentsCompleted
                    : [];

                  if (consultingStatus === 'started') {
                    lastMessage.consultingAgents = Array.from(new Set([...currentInProgress, consultingAgentId]));
                    lastMessage.consultedAgentsCompleted = Array.from(
                      new Set(currentCompleted.filter((id) => id !== consultingAgentId))
                    );
                  }

                  if (consultingStatus === 'completed') {
                    lastMessage.consultingAgents = currentInProgress.filter((id) => id !== consultingAgentId);
                    lastMessage.consultedAgentsCompleted = Array.from(new Set([...currentCompleted, consultingAgentId]));
                  }

                  lastMessage.agent = currentAgent;
                  return newMessages;
                });
              }

              if (data.content) {
                // In ADK SSE, if it's partial, content is usually the delta
                // If it's final, content is the full message
                if (data.partial) {
                  assistantMessage += data.content;
                } else if (data.isFinal) {
                  assistantMessage = data.content;
                }

                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
                    lastMessage.content = assistantMessage;
                    lastMessage.agent = currentAgent;
                    // Once the assistant starts producing text, stop showing consultation in-progress.
                    lastMessage.consultingAgents = [];
                    lastMessage.phase = 'answering';
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Finalize the message
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage) {
          lastMessage.isStreaming = false;
        }
        // Generate summary after message is finalized
        setTimeout(() => {
          generateSummary(newMessages.filter(m => !m.isStreaming));
        }, 500);
        
        // Detect tasks for assistant messages
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
          const meaningfulMessages = newMessages.filter(m => !m.isStreaming);
          const messageIndex = meaningfulMessages.length - 1;
          setTimeout(() => {
            detectTasks(lastMessage.content, messageIndex);
          }, 1000);

          const messageId = `msg-${meaningfulMessages.length - 1}`;
          setTimeout(() => {
            const snippetMessages = meaningfulMessages.slice(Math.max(0, meaningfulMessages.length - 8));
            const conversationSnippet = snippetMessages
              .map((m) => {
                const role = m.role === 'assistant' ? 'ASSISTANT' : 'USER';
                const text = typeof m.content === 'string' ? m.content.trim() : '';
                if (!text) return '';
                return `${role}: ${text}`;
              })
              .filter(Boolean)
              .join('\n\n');

            suggestMemoriesForMessage({
              messageIndex,
              messageId,
              assistantMessage: lastMessage,
              conversationSnippet,
            });
          }, 1300);
        }
        
        return newMessages;
      });

    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Mission failure: Team communication lost. Please check your connection and try again.', agent: 'system' },
      ]);
    } finally {
      setIsLoading(false);
      setActiveAgent(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && editingMessageIndex !== null) {
      cancelEdit();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 font-sans text-neutral-100 overflow-x-hidden max-w-full">
      {/* Sidebar - Desktop Only */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-neutral-900 border-r border-neutral-800 transition-all duration-300",
          isDesktopSidebarCollapsed ? "w-16" : "w-72"
        )}
      >
        <div className={cn("border-b border-neutral-800", isDesktopSidebarCollapsed ? "p-3" : "p-6")}>
          <div className={cn("flex items-center", isDesktopSidebarCollapsed ? "justify-center mb-3" : "gap-3 mb-6")}>
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-none transition-transform hover:rotate-3">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            {!isDesktopSidebarCollapsed && (
              <div>
                <h2 className="text-lg font-black tracking-tight leading-none">LAUNCH</h2>
                <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase mt-1">Team Control</p>
              </div>
            )}
          </div>

          <div className={cn("flex items-center", isDesktopSidebarCollapsed ? "justify-center" : "justify-between")}>
            {!isDesktopSidebarCollapsed && (
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">
                Navigation
              </p>
            )}
            <button
              type="button"
              onClick={() => setIsDesktopSidebarCollapsed((v) => !v)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label={isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronRight
                size={18}
                className={cn(
                  "text-neutral-400 transition-transform",
                  isDesktopSidebarCollapsed ? "" : "rotate-180"
                )}
              />
            </button>
          </div>

          {isDesktopSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowTeamConfigModal(true)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Team config"
                title="Team config"
              >
                <Settings size={18} className="text-neutral-300" />
              </button>
              <button
                type="button"
                onClick={() => setShowLivePanel(true)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors relative"
                aria-label="Open live panel"
                title="Open live panel"
              >
                <FileText size={18} className="text-neutral-300" />
                {sessionDocuments.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                    {sessionDocuments.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamForSession(currentTeamId || '');
                  setShowTeamSelectionModal(true);
                }}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="New session"
                title="New session"
              >
                <Plus size={18} className="text-neutral-300" />
              </button>
              <a
                href="/documents"
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Documents"
                title="Documents"
              >
                <FileText size={18} className="text-neutral-300" />
              </a>
            </div>
          ) : (
            <div className="space-y-4">
            {/* Team Selector */}
            <div className="p-3 bg-neutral-800/50 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Current Team</p>
                <button
                  onClick={() => {
                    setEditingTeam({ name: '', description: '', teamLeadAgentId: '', subAgentIds: [] });
                    setShowTeamModal(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
                  aria-label="New team"
                >
                  <Plus size={14} className="text-neutral-400" />
                </button>
              </div>
              {isLoadingTeams ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 size={14} className="animate-spin text-neutral-400" />
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-xs text-neutral-500 mb-2">No teams yet</p>
                  <button
                    onClick={() => {
                      setEditingTeam({ name: '', description: '', teamLeadAgentId: '', subAgentIds: [] });
                      setShowTeamModal(true);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Create Team
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={currentTeamId || ''}
                    onChange={(e) => setCurrentTeamId(e.target.value)}
                    className="w-full p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  {currentTeamId && (
                  <button
                    onClick={() => {
                      const team = teams.find(t => t.id === currentTeamId);
                      if (team) {
                        setEditingTeam({ ...team });
                        setShowTeamModal(true);
                      }
                    }}
                    className="w-full text-xs text-neutral-400 hover:text-neutral-300 text-left"
                  >
                    Edit Team →
                  </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 bg-neutral-800/50 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Active Session</p>
                <button
                  onClick={() => {
                    // Always require team selection before starting a new conversation
                    setSelectedTeamForSession(currentTeamId || '');
                    setShowTeamSelectionModal(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
                  aria-label="New session"
                >
                  <Plus size={14} className="text-neutral-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-2 h-2 rounded-full transition-all duration-500", isLoading ? "bg-amber-500 animate-pulse" : "bg-green-500")} />
                <span className="text-xs font-semibold">{isLoading ? 'Processing...' : 'Ready'}</span>
              </div>
              {currentSessionId && (
                <p className="text-[10px] text-neutral-500 truncate">
                  {sessions.find(s => s.id === currentSessionId)?.title || 'Current Session'}
                </p>
              )}
              <div className="mt-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                  {agentMode === 'all' ? (
                    <>
                      <Users size={12} className="text-indigo-400" />
                      <span className="text-[10px] font-semibold text-indigo-400">Hierarchical Mode</span>
                    </>
                  ) : (
                    <>
                      <Bot size={12} className="text-purple-400" />
                      <span className="text-[10px] font-semibold text-purple-400">
                        {getAgentDisplayName(selectedAgentId) || 'Direct Mode'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Conversations</p>
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-neutral-400" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-[10px] text-neutral-500 italic">No conversations yet</p>
              ) : (
                sessions.map((session) => {
                  const sessionTeam = teams.find(t => t.id === session.teamId);
                  return (
                    <div
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={cn(
                        "group relative p-2 rounded-lg cursor-pointer transition-all",
                        currentSessionId === session.id
                          ? "bg-indigo-900/20 border border-indigo-800"
                          : "hover:bg-neutral-800 border border-transparent"
                      )}
                    >
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveSessionTitle(session.id);
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            className="flex-1 text-[11px] font-semibold bg-neutral-900 border border-indigo-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveSessionTitle(session.id);
                            }}
                            className="p-1 hover:bg-indigo-900 rounded"
                          >
                            <Check size={12} className="text-indigo-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(null);
                            }}
                            className="p-1 hover:bg-neutral-700 rounded"
                          >
                            <X size={12} className="text-neutral-400" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-[11px] font-semibold text-neutral-100 line-clamp-2">
                                {session.title}
                              </p>
                              {sessionTeam && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 text-[8px] font-medium text-indigo-400 bg-indigo-900/30 rounded border border-indigo-800/50">
                                  {sessionTeam.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => startEditingTitle(session, e)}
                                className="p-1 hover:bg-neutral-700 rounded"
                              >
                                <Edit2 size={10} className="text-neutral-500" />
                              </button>
                              <button
                                onClick={(e) => deleteSession(session.id, e)}
                                className="p-1 hover:bg-red-900/30 rounded"
                              >
                                <Trash2 size={10} className="text-red-500" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[9px] text-neutral-400 mt-1">
                            {new Date(session.updatedAt.seconds * 1000).toLocaleDateString()}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          )}
        </div>

        {!isDesktopSidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-6 space-y-8"></div>
        )}

        <div className={cn("border-t border-neutral-800", isDesktopSidebarCollapsed ? "p-3" : "p-6")}>
          {isDesktopSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-lg text-neutral-400" title="Enterprise Security Active" aria-label="Enterprise Security Active">
                <ShieldCheck size={18} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <a
                href="/documents"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
              >
                <FileText size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Documents</span>
              </a>
              <div className="flex items-center gap-3 text-neutral-400">
                <ShieldCheck size={18} />
                <span className="text-xs font-medium">Enterprise Security Active</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {showMobileSidebar && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/70 z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
          
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 w-4/5 bg-neutral-900 border-r border-neutral-800 z-50 flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out">
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-none">
                    <Zap className="text-white w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight leading-none">LAUNCH</h2>
                    <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase mt-1">Team Control</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close sidebar"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-neutral-800/50 rounded-xl border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Active Session</p>
                    <button
                      onClick={() => {
                        // Always require team selection before starting a new conversation
                        setSelectedTeamForSession(currentTeamId || '');
                        setShowTeamSelectionModal(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
                      aria-label="New session"
                    >
                      <Plus size={14} className="text-neutral-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("w-2 h-2 rounded-full transition-all duration-500", isLoading ? "bg-amber-500 animate-pulse" : "bg-green-500")} />
                    <span className="text-xs font-semibold">{isLoading ? 'Processing...' : 'Ready'}</span>
                  </div>
                  {currentSessionId && (
                    <p className="text-[10px] text-neutral-500 truncate">
                      {sessions.find(s => s.id === currentSessionId)?.title || 'Current Session'}
                    </p>
                  )}
                  <div className="mt-2 pt-2 border-t border-neutral-800">
                    <div className="flex items-center gap-2">
                      {agentMode === 'all' ? (
                        <>
                          <Users size={12} className="text-indigo-400" />
                          <span className="text-[10px] font-semibold text-indigo-400">Hierarchical Mode</span>
                        </>
                      ) : (
                        <>
                          <Bot size={12} className="text-purple-400" />
                          <span className="text-[10px] font-semibold text-purple-400">
                            {getAgentDisplayName(selectedAgentId) || 'Direct Mode'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sessions List */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Conversations</p>
                  {isLoadingSessions ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-neutral-400" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-[10px] text-neutral-500 italic">No conversations yet</p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          loadSession(session.id);
                          setShowMobileSidebar(false);
                        }}
                        className={cn(
                          "group relative p-2 rounded-lg cursor-pointer transition-all",
                          currentSessionId === session.id
                            ? "bg-indigo-900/20 border border-indigo-800"
                            : "hover:bg-neutral-800 border border-transparent"
                        )}
                      >
                        {editingSessionId === session.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveSessionTitle(session.id);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              className="flex-1 text-[11px] font-semibold bg-neutral-900 border border-indigo-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveSessionTitle(session.id);
                              }}
                              className="p-1 hover:bg-indigo-900 rounded"
                            >
                              <Check size={12} className="text-indigo-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(null);
                              }}
                              className="p-1 hover:bg-neutral-700 rounded"
                            >
                              <X size={12} className="text-neutral-400" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] font-semibold text-neutral-100 line-clamp-2 flex-1">
                                {session.title}
                              </p>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => startEditingTitle(session, e)}
                                  className="p-1 hover:bg-neutral-700 rounded"
                                >
                                  <Edit2 size={10} className="text-neutral-500" />
                                </button>
                                <button
                                  onClick={(e) => deleteSession(session.id, e)}
                                  className="p-1 hover:bg-red-900/30 rounded"
                                >
                                  <Trash2 size={10} className="text-red-500" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[9px] text-neutral-400 mt-1">
                              {new Date(session.updatedAt.seconds * 1000).toLocaleDateString()}
                            </p>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                  {currentTeamId ? (teams.find(t => t.id === currentTeamId)?.name || 'Hierarchical Team') : 'Hierarchical Team'}
                </h3>
                <div className="space-y-3">
                  {(() => {
                    // Get current team
                    const currentTeam = teams.find(t => t.id === currentTeamId);
                    if (!currentTeam) {
                      return null;
                    }
                    
                    // Get team lead agent
                    const teamLead = allAgents.find(a => a.id === currentTeam.teamLeadAgentId);
                    
                    // Map to display format with icon mapping
                    const iconMap: Record<string, any> = {
                      'chief_of_staff': Bot,
                      'fundraising_cash_flow_advisor': Search,
                      'gtm_revenue_growth_strategist': Users,
                      'product_technical_advisor': Bot,
                      'legal_compliance_advisor': ShieldCheck,
                      'brand_voice_marketing_agent': Sparkles,
                      'documentation_knowledge_manager': PenTool,
                      'community_engagement_manager': Activity,
                      'founder_wellbeing_advisor': Activity,
                      'operations_scaling_advisor': Users,
                      'gbeta_program_specialist': Info,
                    };
                    
                    const colorMap: Record<string, string> = {
                      'chief_of_staff': 'bg-indigo-500',
                      'fundraising_cash_flow_advisor': 'bg-emerald-600',
                      'gtm_revenue_growth_strategist': 'bg-blue-600',
                      'product_technical_advisor': 'bg-slate-700',
                      'legal_compliance_advisor': 'bg-neutral-700',
                      'brand_voice_marketing_agent': 'bg-amber-600',
                      'documentation_knowledge_manager': 'bg-purple-600',
                      'community_engagement_manager': 'bg-pink-600',
                      'founder_wellbeing_advisor': 'bg-rose-600',
                      'operations_scaling_advisor': 'bg-cyan-700',
                      'gbeta_program_specialist': 'bg-indigo-700',
                    };
                    
                    if (!teamLead) {
                      return null;
                    }
                    
                    const teamLeadDisplay = {
                      id: teamLead.id,
                      name: teamLead.name,
                      role: teamLead.description || 'Team Lead',
                      icon: iconMap[teamLead.id] || Bot,
                      color: colorMap[teamLead.id] || 'bg-indigo-500'
                    };
                    
                    return (
                      <>
                        <div 
                          onClick={() => {
                            setEditingTeam({ ...currentTeam });
                            setShowTeamModal(true);
                            setShowMobileSidebar(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-all duration-300 cursor-pointer group",
                            activeAgent === teamLeadDisplay.id ? "bg-indigo-900/20 scale-105" : "opacity-70 hover:opacity-100 hover:bg-neutral-800"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm", teamLeadDisplay.color)}>
                            <teamLeadDisplay.icon size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold">{teamLeadDisplay.name}</p>
                            <p className="text-[10px] text-neutral-500">{teamLeadDisplay.role}</p>
                            {currentTeam.subAgentIds.length > 0 && (
                              <p className="text-[9px] text-neutral-600 mt-1">
                                {currentTeam.subAgentIds.length} sub-agent{currentTeam.subAgentIds.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          {activeAgent === teamLeadDisplay.id && (
                            <div className="ml-auto">
                              <Activity size={14} className="text-indigo-500 animate-pulse" />
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeam({ ...currentTeam });
                              setShowTeamModal(true);
                              setShowMobileSidebar(false);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-700 rounded"
                            aria-label="Edit team"
                          >
                            <Edit2 size={14} className="text-neutral-500" />
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setEditingTeam({ name: '', description: '', teamLeadAgentId: '', subAgentIds: [] });
                            setShowTeamModal(true);
                            setShowMobileSidebar(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 p-2.5 mt-2 rounded-lg border border-dashed border-neutral-700 hover:border-indigo-600 hover:bg-indigo-900/10 transition-all text-xs font-medium text-neutral-400 hover:text-indigo-400"
                        >
                          <Plus size={14} />
                          Create New Team
                        </button>
                      </>
                    );
                  })()}
                  {(() => {
                    // Show create button if no team is selected
                    const currentTeam = teams.find(t => t.id === currentTeamId);
                    if (!currentTeam) {
                      return (
                        <button
                          onClick={() => {
                            setEditingTeam({ name: '', description: '', teamLeadAgentId: '', subAgentIds: [] });
                            setShowTeamModal(true);
                            setShowMobileSidebar(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-neutral-700 hover:border-indigo-600 hover:bg-indigo-900/10 transition-all text-sm font-medium text-neutral-400 hover:text-indigo-400"
                        >
                          <Plus size={16} />
                          Create New Team
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </section>

            </div>

            <div className="p-6 border-t border-neutral-800 space-y-3">
              <a
                href="/documents"
                onClick={() => setShowMobileSidebar(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
              >
                <FileText size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Documents</span>
              </a>
              <div className="flex items-center gap-3 text-neutral-400">
                <ShieldCheck size={18} />
                <span className="text-xs font-medium">Enterprise Security Active</span>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white w-5 h-5 fill-white" />
            </div>
            <h1 className="text-base font-black uppercase tracking-tighter">Launch Hub</h1>
          </div>
          <div className="flex items-center gap-2">
             {activeAgent && <div className="text-[10px] font-bold text-indigo-500 animate-pulse uppercase">{activeAgent.replace('_', ' ')} ACTIVE</div>}
             <button 
               onClick={() => setShowLivePanel(true)}
               className="p-2 text-neutral-500 hover:text-neutral-100 transition-colors relative"
               aria-label="Open live panel"
             >
              <FileText size={20} />
              {sessionDocuments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                  {sessionDocuments.length}
                </span>
              )}
            </button>
             <button 
               onClick={() => setShowMobileSidebar(true)}
               className="p-2 text-neutral-500 hover:text-neutral-100 transition-colors"
               aria-label="Open menu"
             >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-8 py-10 space-y-8 scrollbar-thin scrollbar-thumb-neutral-800"
        >
          <div className="max-w-4xl mx-auto space-y-10 w-full">
            {messages.map((msg, index) => {
              // Filter out streaming messages for meaningful index
              const meaningfulIndex = messages.slice(0, index + 1).filter(m => !m.isStreaming).length - 1;
              return (
                <div
                  key={index}
                  ref={(el) => {
                    if (el && meaningfulIndex >= 0) {
                      messageRefs.current.set(meaningfulIndex, el);
                    }
                  }}
                  className={cn(
                    "flex items-start gap-4 md:gap-6 group transition-all duration-300",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                {/* Avatar */}
                <div className={cn(
                  "w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-transform group-hover:scale-105",
                  msg.role === 'user' 
                    ? "bg-neutral-900 text-white border-neutral-800" 
                    : "bg-neutral-900 text-indigo-400 border-neutral-800"
                )}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={22} />}
                </div>

                {/* Content Wrapper */}
                <div className={cn(
                  "flex flex-col gap-2 w-full max-w-[85%] sm:max-w-[80%] md:max-w-[75%] min-w-0",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}
                style={{ maxWidth: 'calc(100% - 3rem)' }}
                >
                  {/* Metadata */}
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' && msg.agent && (
                      <AgentBadge 
                        name={msg.agent} 
                        isActive={activeAgent === msg.agent && msg.isStreaming} 
                      />
                    )}
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      {msg.role === 'user' ? 'Operator' : 'AI Team'}
                    </span>
                  </div>

                  {msg.role === 'assistant' && msg.isStreaming && Array.isArray(msg.consultingAgents) && msg.consultingAgents.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                        Consulting
                      </span>
                      {msg.consultingAgents.map((agentId) => (
                        <span
                          key={agentId}
                          className="rounded-full border border-indigo-900/40 bg-indigo-950/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-200"
                        >
                          {getAgentDisplayName(agentId) || agentId.replaceAll('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.role === 'assistant' && Array.isArray(msg.consultedAgents) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                        Consulted
                      </span>
                      {msg.consultedAgents.length === 0 ? (
                        <span className="text-[10px] font-semibold text-neutral-500">
                          none
                        </span>
                      ) : (
                        msg.consultedAgents.map((agentId) => (
                          <span
                            key={agentId}
                            className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold text-neutral-300"
                          >
                            {getAgentDisplayName(agentId) || agentId.replaceAll('_', ' ')}
                          </span>
                        ))
                      )}
                    </div>
                  )}

                  {/* Bubble */}
                  <div 
                    className={cn(
                      "px-4 sm:px-5 py-4 rounded-3xl text-[15px] leading-relaxed shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] shadow-none break-words overflow-wrap-anywhere w-full max-w-full",
                      msg.role === 'user'
                        ? "bg-indigo-600 text-white rounded-tr-none selection:bg-indigo-300"
                        : "bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-tl-none selection:bg-indigo-900/50"
                    )}
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}
                  >
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {msg.attachments.some((a) => a.kind === 'image') && (
                          <div className="grid grid-cols-2 gap-2">
                            {msg.attachments
                              .filter((a) => a.kind === 'image')
                              .slice(0, 6)
                              .map((att) => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                                  aria-label={`Open image ${att.name}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="h-36 w-full object-cover"
                                    loading="lazy"
                                  />
                                </a>
                              ))}
                          </div>
                        )}

                        {msg.attachments.some((a) => a.kind === 'file') && (
                          <div className="flex flex-col gap-2">
                            {msg.attachments
                              .filter((a) => a.kind === 'file')
                              .slice(0, 6)
                              .map((att) => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors min-w-0",
                                    msg.role === 'user'
                                      ? "border-indigo-300/30 bg-indigo-500/20 hover:bg-indigo-500/30"
                                      : "border-neutral-800 bg-neutral-950 hover:bg-neutral-900"
                                  )}
                                  aria-label={`Open file ${att.name}`}
                                >
                                  <FileIcon size={14} className={cn(msg.role === 'user' ? "text-indigo-100" : "text-neutral-300")} />
                                  <span className="truncate min-w-0 flex-1">{att.name}</span>
                                  <span className={cn("ml-auto text-[10px] font-bold opacity-70", msg.role === 'user' ? "text-indigo-100" : "text-neutral-400")}>
                                    {(att.sizeBytes / (1024 * 1024)).toFixed(1)}MB
                                  </span>
                                </a>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className="w-full max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
                      <MarkdownMessage content={msg.content} />
                    </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Message Footer with Copy and Save buttons */}
                  {!msg.isStreaming && (
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.role === 'assistant' && (
                        <div className="relative">
                          <button
                            onClick={() => {
                              const messageId = `msg-${meaningfulIndex}`;
                              setMemoryModalData({ messageId, meaningfulIndex });
                              setShowMemoryModal(true);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors",
                              "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                            )}
                            aria-label="Add to agent memory"
                            type="button"
                          >
                            <Brain size={12} />
                            Memory
                            {isSuggestingMemories.get(`msg-${meaningfulIndex}`) ? (
                              <Loader2 size={12} className="animate-spin ml-1" />
                            ) : null}
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleCopyMessage(msg.content, `msg-${index}`)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors",
                          copiedMessageId === `msg-${index}`
                            ? "bg-green-900/30 text-green-400"
                            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                        )}
                      >
                        {copiedMessageId === `msg-${index}` ? (
                          <>
                            <CheckCircle size={12} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleSaveToDocs(msg.content, msg.agent)}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 transition-colors"
                      >
                        <FileText size={12} />
                        Save to Docs
                      </button>
                      <button
                        onClick={() => handleTextToSpeech(msg, index)}
                        disabled={loadingTTSMessageId === `msg-${index}`}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors",
                          playingTTSMessageId === `msg-${index}`
                            ? "bg-indigo-900/30 text-indigo-400"
                            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700",
                          loadingTTSMessageId === `msg-${index}` && "opacity-50 cursor-not-allowed"
                        )}
                        aria-label="Read aloud"
                      >
                        {loadingTTSMessageId === `msg-${index}` ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Volume2 size={12} className={cn(playingTTSMessageId === `msg-${index}` && "animate-pulse")} />
                        )}
                        {playingTTSMessageId === `msg-${index}` ? 'Playing...' : 'Speak'}
                      </button>
                    </div>
                  )}

                  {msg.role === 'user' && !msg.isStreaming && (
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditMessage(index)}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 transition-colors"
                        aria-label="Edit message"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleCopyMessage(msg.content, `msg-${index}`)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-lg transition-colors",
                          copiedMessageId === `msg-${index}`
                            ? "bg-green-900/30 text-green-400"
                            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                        )}
                      >
                        {copiedMessageId === `msg-${index}` ? (
                          <>
                            <CheckCircle size={12} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Detected Tasks */}
                  {msg.role === 'assistant' && !msg.isStreaming && (() => {
                    const meaningfulIndex = messages.slice(0, index + 1).filter(m => !m.isStreaming).length - 1;
                    const tasks = detectedTasks.get(meaningfulIndex) || [];
                    const detecting = isDetectingTasks.get(meaningfulIndex);
                    
                    if (detecting) {
                      return (
                        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                          <Loader2 size={12} className="animate-spin" />
                          Detecting tasks...
                        </div>
                      );
                    }
                    
                    if (tasks.length > 0) {
                      return (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-neutral-400 mb-2">Suggested Tasks:</p>
                          {tasks.map((task, taskIndex) => (
                            <div
                              key={taskIndex}
                              className="flex items-center gap-2 p-2 bg-indigo-900/20 border border-indigo-800/50 rounded-lg"
                            >
                              <span className="text-xs text-neutral-300 flex-1">{task}</span>
                              <button
                                onClick={() => saveTask(task, meaningfulIndex)}
                                className="px-2 py-1 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => dismissTask(meaningfulIndex, task)}
                                className="px-2 py-1 text-[10px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                </div>
              );
            })}

            {isLoading && !messages[messages.length - 1].isStreaming && (
              <div className="flex items-start gap-4 md:gap-6 animate-pulse">
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-2xl bg-indigo-900/30 flex items-center justify-center border border-indigo-800">
                  <Loader2 size={20} className="text-indigo-400 animate-spin" />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <div className="h-4 w-24 bg-neutral-800 rounded-full" />
                  <div className="h-20 w-3/4 bg-neutral-900 border border-neutral-800 rounded-3xl rounded-tl-none flex items-center px-6">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 md:p-8 bg-neutral-950 border-t border-neutral-800">
          <form 
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto"
          >
            {editingMessageIndex !== null && (
              <div className="mb-3 px-4 py-2 bg-indigo-900/30 border border-indigo-800/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil size={14} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-100">Editing message...</span>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs font-bold text-neutral-400 hover:text-neutral-200 transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="relative flex items-end gap-3 p-2 bg-neutral-900 rounded-[2rem] border border-neutral-800 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.csv,.txt,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <div className="p-3 text-neutral-400 hidden sm:block">
                <MessageSquare size={20} />
              </div>

              <button
                type="button"
                onClick={handleSelectAttachments}
                className="p-3 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-2xl transition-colors"
                aria-label="Attach files"
              >
                <Paperclip size={20} />
              </button>
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Brief your team..."
                rows={1}
                className="flex-1 bg-transparent text-neutral-100 pl-1 pr-12 py-3 focus:outline-none resize-none overflow-y-auto text-base min-h-[50px] max-h-[400px] break-words overflow-wrap-anywhere min-w-0"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              
              <button
                type="submit"
                disabled={
                  isLoading ||
                  (input.trim().length === 0 && !pendingAttachments.some((a) => a.status === 'ready')) ||
                  pendingAttachments.some((a) => a.status === 'uploading')
                }
                className={cn(
                  "absolute right-2 bottom-2 p-3 rounded-full transition-all flex items-center justify-center overflow-hidden",
                  (input.trim().length === 0 && !pendingAttachments.some((a) => a.status === 'ready')) ||
                    isLoading ||
                    pendingAttachments.some((a) => a.status === 'uploading')
                    ? "bg-neutral-800 text-neutral-400"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-lg shadow-none"
                )}
                aria-label="Send message"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>

            {pendingAttachments.length > 0 && (
              <div className="mt-3 px-4 flex flex-wrap gap-2">
                {pendingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold max-w-full",
                      att.status === 'error'
                        ? "border-red-800 bg-red-900/20 text-red-300"
                        : "border-neutral-800 bg-neutral-900 text-neutral-200"
                    )}
                  >
                    {att.kind === 'image' ? (
                      <ImageIcon size={14} className="text-indigo-400 shrink-0" />
                    ) : (
                      <FileIcon size={14} className="text-neutral-300 shrink-0" />
                    )}
                    <span className="truncate max-w-[180px] sm:max-w-[260px]">{att.name}</span>
                    {att.status === 'uploading' && (
                      <span className="text-[10px] font-bold text-neutral-400">{att.progress}%</span>
                    )}
                    {att.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => handleRemovePendingAttachment(att.id)}
                        className="ml-1 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                        aria-label={`Remove ${att.name}`}
                      >
                        <XIcon size={14} className="text-neutral-400" />
                      </button>
                    )}
                    {att.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => handleRemovePendingAttachment(att.id)}
                        className="ml-1 p-1 rounded-lg hover:bg-red-900/30 transition-colors"
                        aria-label={`Dismiss error for ${att.name}`}
                      >
                        <XIcon size={14} className="text-red-300" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center mt-3 px-4">
              <div className="flex gap-4">
                <button type="button" className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-widest flex items-center gap-1">
                  <Bot size={12} />
                  Agent Logs
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowTeamConfigModal(true)}
                  className="text-[10px] font-bold text-neutral-400 hover:text-neutral-300 transition-colors uppercase tracking-widest flex items-center gap-1"
                >
                  <Users size={12} />
                  Team Config
                </button>
              </div>
              <p className="text-[10px] font-bold text-neutral-700 uppercase tracking-[0.2em]">
                V0.4.2-ALPHA
              </p>
            </div>
          </form>
        </div>

        {/* Team Config Modal */}
        {showTeamConfigModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-800">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <Settings size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-100">Team Configuration</h2>
                    <p className="text-sm text-neutral-400">Choose how to interact with your AI team</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeamConfigModal(false)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <XCircle size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Mode Selection */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-neutral-100">
                    Communication Mode
                  </label>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-neutral-800/50"
                      style={{ borderColor: agentMode === 'all' ? 'rgb(99, 102, 241)' : 'transparent' }}>
                      <input
                        type="radio"
                        name="agentMode"
                        value="all"
                        checked={agentMode === 'all'}
                        onChange={(e) => {
                          setAgentMode('all');
                          setSelectedAgentId('chief_of_staff');
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={16} className="text-indigo-400" />
                          <span className="font-bold text-neutral-100">All Agents (Hierarchical Team)</span>
                        </div>
                        <p className="text-sm text-neutral-400">
                          Chief of Staff coordinates and delegates to specialists automatically. You'll see handoffs between agents in real-time.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-neutral-800/50"
                      style={{ borderColor: agentMode === 'specific' ? 'rgb(99, 102, 241)' : 'transparent' }}>
                      <input
                        type="radio"
                        name="agentMode"
                        value="specific"
                        checked={agentMode === 'specific'}
                        onChange={() => {
                          setAgentMode('specific');
                          // Ensure a valid selected agent (prefer Firestore agents)
                          const next =
                            allAgents.find((a) => a.id === selectedAgentId)?.id ||
                            allAgents[0]?.id ||
                            selectedAgentId ||
                            'chief_of_staff';
                          setSelectedAgentId(next);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Bot size={16} className="text-indigo-400" />
                          <span className="font-bold text-neutral-100">Specific Agent</span>
                        </div>
                        <p className="text-sm text-neutral-400">
                          Talk directly to a single agent without delegation or handoffs.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Agent Selection Dropdown (only shown when specific mode is selected) */}
                {agentMode === 'specific' && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-neutral-100">
                      Select Agent
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                      >
                        {allAgents.length > 0 ? (
                          <>
                            {teams.map((team) => {
                              const lead = allAgents.find((a) => a.id === team.teamLeadAgentId);
                              const subs = allAgents.filter((a) => (team.subAgentIds || []).includes(a.id));
                              const agentsForTeam = [lead, ...subs].filter(Boolean) as any[];
                              if (agentsForTeam.length === 0) return null;

                              return (
                                <optgroup key={team.id} label={`Team: ${team.name}`}>
                                  {agentsForTeam.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                      {agent.name}
                                      {agent.agentType === 'team_lead' ? ' (Lead)' : ''}{agent.description ? ` — ${agent.description}` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}

                            {(() => {
                              const assigned = new Set<string>();
                              teams.forEach((t) => {
                                if (t.teamLeadAgentId) assigned.add(t.teamLeadAgentId);
                                (t.subAgentIds || []).forEach((id: string) => assigned.add(id));
                              });
                              const unassigned = allAgents.filter((a) => !assigned.has(a.id));
                              if (unassigned.length === 0) return null;
                              return (
                                <optgroup label="Unassigned Agents">
                                  {unassigned.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                      {agent.name}
                                      {agent.agentType === 'team_lead' ? ' (Lead)' : ''}{agent.description ? ` — ${agent.description}` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })()}
                          </>
                        ) : (
                          agentOptions.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} - {agent.role}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none rotate-90" />
                    </div>
                    
                    {/* Selected Agent Preview */}
                    <div className="p-4 bg-indigo-900/20 rounded-xl border border-indigo-800">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const selected =
                            allAgents.find((a) => a.id === selectedAgentId) ||
                            agentOptions.find((a) => a.id === selectedAgentId);
                          const fallback = agentOptions.find((a) => a.id === selectedAgentId);
                          const Icon = (fallback as any)?.icon || Bot;
                          return (
                            <>
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm",
                                  (fallback as any)?.color || 'bg-neutral-700'
                                )}
                              >
                                <Icon size={18} />
                              </div>
                              <div>
                                <p className="font-bold text-neutral-100">{(selected as any)?.name || getAgentDisplayName(selectedAgentId)}</p>
                                <p className="text-sm text-neutral-400">
                                  {(selected as any)?.description || (selected as any)?.role || getAgentDisplayRole(selectedAgentId)}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Mode Indicator */}
                <div className="p-4 bg-neutral-800/50 rounded-xl border border-neutral-800">
                  <div className="flex items-center gap-2 text-sm">
                    <Info size={16} className="text-indigo-400" />
                    <span className="text-neutral-300">
                      {agentMode === 'all' 
                        ? 'Messages will be routed through Chief of Staff with automatic delegation.'
                        : `Messages will go directly to ${getAgentDisplayName(selectedAgentId) || 'selected agent'}.`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowTeamConfigModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowTeamConfigModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent Prompt Editor Modal */}
        {showPromptEditor && editingAgentId && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-neutral-800">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <PenTool size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-100">
                      Edit {(() => {
                        // Try to get name from new agents system
                        const agent = allAgents.find(a => a.id === editingAgentId);
                        if (agent) return agent.name;
                        // Fallback to old system
                        return agentOptions.find(a => a.id === editingAgentId)?.name || 'Agent';
                      })()} Prompt
                    </h2>
                    <p className="text-sm text-neutral-400">
                      Modify the system prompt for this agent. Changes are saved to Firestore.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPromptEditor(false);
                    setEditingAgentId(null);
                    setEditingPrompt('');
                  }}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <XCircle size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <textarea
                  value={editingPrompt}
                  onChange={(e) => setEditingPrompt(e.target.value)}
                  placeholder="Enter the system prompt for this agent..."
                  className="w-full h-full min-h-[400px] p-4 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />

                <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">Saved memories</h3>
                      <p className="text-xs text-neutral-400">These are appended to the agent at runtime on the next turn.</p>
                    </div>
                    {isLoadingAgentMemories && (
                      <div className="text-xs font-semibold text-neutral-400">
                        <Loader2 size={14} className="inline-block animate-spin mr-2" />
                        Loading…
                      </div>
                    )}
                  </div>

                  {(() => {
                    const agentId = editingAgentId;
                    const memories = agentId ? agentMemoriesByAgentId[agentId] : [];
                    if (!agentId) {
                      return <p className="text-xs text-neutral-500">No agent selected.</p>;
                    }
                    if (!Array.isArray(memories) || memories.length === 0) {
                      return <p className="text-xs text-neutral-500">No saved memories yet.</p>;
                    }

                    return (
                      <div className="space-y-3">
                        {memories.map((mem) => {
                          const createdAt = formatTimestamp(mem.createdAt);
                          const isSaving = isSavingAgentMemory.get(mem.id) === true;
                          const isDeleting = isDeletingAgentMemory.get(mem.id) === true;
                          return (
                            <div key={mem.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                  {createdAt ? `Saved ${createdAt}` : 'Saved'}
                                </p>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAgentMemory({ memoryId: mem.id, agentId, text: mem.text })}
                                    disabled={isSaving || isDeleting || !mem.text?.trim()}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[10px] font-bold transition-colors",
                                      isSaving || isDeleting || !mem.text?.trim()
                                        ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                                    )}
                                    aria-label="Save memory"
                                  >
                                    {isSaving ? 'Saving…' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAgentMemory({ memoryId: mem.id, agentId })}
                                    disabled={isSaving || isDeleting}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[10px] font-bold transition-colors",
                                      isSaving || isDeleting
                                        ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                                        : "bg-red-900/40 text-red-300 hover:bg-red-900/60"
                                    )}
                                    aria-label="Delete memory"
                                  >
                                    {isDeleting ? 'Deleting…' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={mem.text}
                                onChange={(e) => {
                                  const nextText = e.target.value;
                                  setAgentMemoriesByAgentId((prev) => {
                                    const current = Array.isArray(prev[agentId]) ? prev[agentId] : [];
                                    const next = current.map((m) => (m.id === mem.id ? { ...m, text: nextText } : m));
                                    return { ...prev, [agentId]: next };
                                  });
                                }}
                                className="w-full min-h-[80px] p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 font-mono text-xs resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                aria-label="Memory text"
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPromptEditor(false);
                    setEditingAgentId(null);
                    setEditingPrompt('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrompt}
                  disabled={isSavingPrompt || !editingPrompt.trim()}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors",
                    isSavingPrompt || !editingPrompt.trim()
                      ? "bg-neutral-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {isSavingPrompt ? (
                    <>
                      <Loader2 size={16} className="inline-block animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Prompt'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to Agent Memory Modal */}
        {showMemoryModal && memoryModalData && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-neutral-800">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <Brain size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-100">Add to agent memory</h2>
                    <p className="text-sm text-neutral-400">Save key context or preferences to improve future responses</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMemoryModal(false);
                    setMemoryModalData(null);
                  }}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <XCircle size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(() => {
                  const { messageId } = memoryModalData;
                  const byAgent = suggestedMemories[messageId] || {};
                  const agentIds = Object.keys(byAgent);
                  const hasAny = agentIds.some((a) => Array.isArray(byAgent[a]) && byAgent[a].length > 0);

                  if (!hasAny) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                          <Brain size={24} className="text-neutral-500" />
                        </div>
                        <p className="text-neutral-400 max-w-xs">
                          {isSuggestingMemories.get(messageId)
                            ? 'Analyzing conversation to suggest memories...'
                            : 'No specific memories suggested for this message.'}
                        </p>
                        {isSuggestingMemories.get(messageId) && (
                          <Loader2 size={24} className="animate-spin text-indigo-500 mt-4" />
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="grid gap-6">
                      {agentIds.map((agentId) => {
                        const suggestions = Array.isArray(byAgent[agentId]) ? byAgent[agentId] : [];
                        if (suggestions.length === 0) return null;
                        return (
                          <div key={agentId} className="space-y-3">
                            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                              <Bot size={14} />
                              {getAgentDisplayName(agentId) || agentId.replaceAll('_', ' ')}
                            </h3>
                            <div className="grid gap-3">
                              {suggestions.map((s, idx) => (
                                <div 
                                  key={idx} 
                                  className="group flex items-start gap-4 p-4 bg-neutral-800/50 border border-neutral-800 rounded-xl hover:border-indigo-500/50 transition-colors"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                                      {s}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddMemoryToAgent({ agentId, text: s, messageId })}
                                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
                                  >
                                    Add
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end">
                <button
                  onClick={() => {
                    setShowMemoryModal(false);
                    setMemoryModalData(null);
                  }}
                  className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-bold rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Document Modal */}
        {showSaveDocModal && docToSave && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full border border-neutral-800">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <FileText size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-100">
                      Save to Documents
                    </h2>
                    <p className="text-sm text-neutral-400">
                      Give this document a title
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSaveDocModal(false);
                    setDocToSave(null);
                    setDocTitle('');
                  }}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <XCircle size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-100 mb-2">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && docTitle.trim()) {
                        handleSaveDocument();
                      }
                    }}
                    placeholder="Enter document title..."
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="p-3 bg-neutral-800 rounded-xl">
                  <p className="text-xs text-neutral-400 mb-1">Preview:</p>
                  <p className="text-sm text-neutral-300 line-clamp-3">
                    {docToSave.content.slice(0, 150)}...
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSaveDocModal(false);
                    setDocToSave(null);
                    setDocTitle('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDocument}
                  disabled={isSavingDoc || !docTitle.trim()}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors",
                    isSavingDoc || !docTitle.trim()
                      ? "bg-neutral-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {isSavingDoc ? (
                    <>
                      <Loader2 size={16} className="inline-block animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Document'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full border border-neutral-800">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <CheckSquare size={20} className="text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">Create Task</h2>
                </div>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setNewTaskName('');
                    setNewTaskDescription('');
                  }}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-100 mb-2">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTaskName.trim() && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateTask();
                      }
                    }}
                    placeholder="Enter task name..."
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-100 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={4}
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setNewTaskName('');
                    setNewTaskDescription('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={isCreatingTask || !newTaskName.trim()}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors",
                    isCreatingTask || !newTaskName.trim()
                      ? "bg-neutral-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {isCreatingTask ? (
                    <>
                      <Loader2 size={16} className="inline-block animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Selection Modal for New Session */}
        {showTeamSelectionModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full border border-neutral-800">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <Plus size={20} className="text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">Select Team for New Session</h2>
                </div>
                <button
                  onClick={() => {
                    setShowTeamSelectionModal(false);
                    setSelectedTeamForSession('');
                  }}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-neutral-400 mb-4">
                  Choose which team this conversation will use. You can change this later.
                </p>
                
                <div className="space-y-2 mb-6">
                  {teams.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic text-center py-4">
                      No teams available. Please create a team first.
                    </p>
                  ) : (
                    teams.map((team) => {
                      const teamLead = allAgents.find(a => a.id === team.teamLeadAgentId);
                      return (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeamForSession(team.id)}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 transition-all text-left",
                            selectedTeamForSession === team.id
                              ? "border-indigo-600 bg-indigo-900/20"
                              : "border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-neutral-100">{team.name}</p>
                              {team.description && (
                                <p className="text-xs text-neutral-500 mt-1">{team.description}</p>
                              )}
                              {teamLead && (
                                <p className="text-[10px] text-neutral-600 mt-1">
                                  Lead: {teamLead.name} • {team.subAgentIds.length} sub-agent{team.subAgentIds.length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            {selectedTeamForSession === team.id && (
                              <CheckCircle size={20} className="text-indigo-400" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowTeamSelectionModal(false);
                      setSelectedTeamForSession('');
                    }}
                    className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSessionWithTeam}
                    disabled={!selectedTeamForSession || teams.length === 0}
                    className={cn(
                      "px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors",
                      !selectedTeamForSession || teams.length === 0
                        ? "bg-neutral-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    Create Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Management Modal */}
        {showTeamModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-neutral-800 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <Users size={20} className="text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">
                    {editingTeam ? 'Edit Team' : 'Create Team'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowTeamModal(false);
                    setEditingTeam(null);
                  }}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Team Name */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-100 mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={editingTeam?.name || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value } as any)}
                    placeholder="e.g., LaunchHub Team"
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                {/* Team Description */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-100 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={editingTeam?.description || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value } as any)}
                    placeholder="Describe what this team is for..."
                    rows={2}
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Team Lead Selection */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-100 mb-2">
                    Team Lead Agent *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={editingTeam?.teamLeadAgentId || ''}
                      onChange={(e) => setEditingTeam({ ...editingTeam, teamLeadAgentId: e.target.value } as any)}
                      className="flex-1 p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select team lead...</option>
                      {allAgents.filter(a => a.agentType === 'team_lead').map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    {editingTeam?.teamLeadAgentId && (
                      <button
                        onClick={() => {
                          handleEditAgentPrompt(editingTeam.teamLeadAgentId);
                          setShowTeamModal(false);
                        }}
                        className="p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-400 hover:text-indigo-400 hover:border-indigo-700 transition-colors"
                        aria-label="Edit team lead prompt"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCreatingAgentType('team_lead');
                      setNewAgentName('');
                      setNewAgentDescription('');
                      setNewAgentPrompt('');
                      setShowAgentCreationModal(true);
                    }}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    + Create New Team Lead
                  </button>
                </div>

                {/* Sub-Agents Selection */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-100 mb-2">
                    Sub-Agents
                  </label>
                  <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-neutral-800/50 rounded-xl border border-neutral-700">
                    {allAgents.filter(a => a.agentType === 'sub_agent').length === 0 ? (
                      <p className="text-xs text-neutral-500 italic">No sub-agents available. Create agents first.</p>
                    ) : (
                      allAgents.filter(a => a.agentType === 'sub_agent').map((agent) => {
                        const isSelected = editingTeam?.subAgentIds?.includes(agent.id) || false;
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2 p-2 hover:bg-neutral-700 rounded-lg transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const currentIds = editingTeam?.subAgentIds || [];
                                const newIds = e.target.checked
                                  ? [...currentIds, agent.id]
                                  : currentIds.filter((id: string) => id !== agent.id);
                                setEditingTeam({ ...editingTeam, subAgentIds: newIds } as any);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-indigo-600 bg-neutral-700 border-neutral-600 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                handleEditAgentPrompt(agent.id);
                                setShowTeamModal(false);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-100 block">{agent.name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAgentPrompt(agent.id);
                                    setShowTeamModal(false);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-600 rounded"
                                  aria-label={`Edit ${agent.name} prompt`}
                                >
                                  <Edit2 size={12} className="text-neutral-400" />
                                </button>
                              </div>
                              {agent.description && (
                                <span className="text-[10px] text-neutral-500 block">{agent.description}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCreatingAgentType('sub_agent');
                      setNewAgentName('');
                      setNewAgentDescription('');
                      setNewAgentPrompt('');
                      setShowAgentCreationModal(true);
                    }}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    + Create New Sub-Agent
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTeamModal(false);
                    setEditingTeam(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!editingTeam?.name || !editingTeam?.teamLeadAgentId) {
                      alert('Please fill in team name and select a team lead');
                      return;
                    }
                    
                    try {
                      const response = editingTeam?.id
                        ? await fetch('/api/teams', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              teamId: editingTeam.id,
                              name: editingTeam.name,
                              description: editingTeam.description,
                              teamLeadAgentId: editingTeam.teamLeadAgentId,
                              subAgentIds: editingTeam.subAgentIds || [],
                            }),
                          })
                        : await fetch('/api/teams', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: editingTeam.name,
                              description: editingTeam.description,
                              teamLeadAgentId: editingTeam.teamLeadAgentId,
                              subAgentIds: editingTeam.subAgentIds || [],
                            }),
                          });
                      
                      if (response.ok) {
                        setShowTeamModal(false);
                        setEditingTeam(null);
                        await loadTeams();
                      } else {
                        throw new Error('Failed to save team');
                      }
                    } catch (error) {
                      console.error('Error saving team:', error);
                      alert('Failed to save team. Please try again.');
                    }
                  }}
                  disabled={!editingTeam?.name || !editingTeam?.teamLeadAgentId}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors",
                    !editingTeam?.name || !editingTeam?.teamLeadAgentId
                      ? "bg-neutral-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  {editingTeam?.id ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Live Panel - Desktop (Right Side) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-neutral-900 border-l border-neutral-800 transition-all duration-300",
          isDesktopLivePanelCollapsed ? "w-16" : "w-[576px]"
        )}
      >
          <div className={cn("border-b border-neutral-800", isDesktopLivePanelCollapsed ? "p-3" : "p-6")}>
            <div className={cn("flex items-center", isDesktopLivePanelCollapsed ? "justify-center mb-3" : "justify-between mb-4")}>
              <div className={cn("flex items-center", isDesktopLivePanelCollapsed ? "justify-center" : "gap-3")}>
                <div className="p-2 bg-indigo-900/30 rounded-lg">
                  <FileText size={20} className="text-indigo-400" />
                </div>
                {!isDesktopLivePanelCollapsed && (
                  <div>
                    <h2 className="text-lg font-black tracking-tight leading-none">Live Docs</h2>
                    <p className="text-[10px] font-bold text-neutral-400 tracking-[0.2em] uppercase mt-1">
                      {sessionDocuments.length} {sessionDocuments.length === 1 ? 'document' : 'documents'}
                    </p>
                  </div>
                )}
              </div>

              {!isDesktopLivePanelCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsDesktopLivePanelCollapsed(true)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Collapse live panel"
                  title="Collapse live panel"
                >
                  <ChevronRight size={18} className="text-neutral-400" />
                </button>
              )}
            </div>

            {isDesktopLivePanelCollapsed && (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDesktopLivePanelCollapsed(false)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Expand live panel"
                  title="Expand live panel"
                >
                  <ChevronRight size={18} className="text-neutral-400 rotate-180" />
                </button>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">
                  {sessionDocuments.length}
                </div>
              </div>
            )}
            {currentSessionId && (
              !isDesktopLivePanelCollapsed && (
                <p className="text-[10px] text-neutral-500 truncate mb-4">
                  {sessions.find(s => s.id === currentSessionId)?.title || 'Current Session'}
                </p>
              )
            )}
            
            {/* Conversation Summary */}
            {!isDesktopLivePanelCollapsed && (
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-400" />
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Conversation Summary</h3>
                </div>
                {isGeneratingSummary && (
                  <Loader2 size={12} className="animate-spin text-indigo-400" />
                )}
              </div>
              
              {/* Navigation Arrows */}
              {summaryHistory.length > 1 && (
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => navigateSummary('prev')}
                    disabled={currentSummaryIndex <= 0}
                    className={cn(
                      "p-1 rounded hover:bg-neutral-800 transition-colors",
                      currentSummaryIndex <= 0 ? "opacity-30 cursor-not-allowed" : "text-neutral-400 hover:text-indigo-400"
                    )}
                    aria-label="Previous summary"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <span className="text-[10px] text-neutral-500">
                    {currentSummaryIndex + 1} / {summaryHistory.length}
                  </span>
                  <button
                    onClick={() => navigateSummary('next')}
                    disabled={currentSummaryIndex >= summaryHistory.length - 1}
                    className={cn(
                      "p-1 rounded hover:bg-neutral-800 transition-colors",
                      currentSummaryIndex >= summaryHistory.length - 1 ? "opacity-30 cursor-not-allowed" : "text-neutral-400 hover:text-indigo-400"
                    )}
                    aria-label="Next summary"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              
              {conversationSummary ? (
                <div className="text-sm text-neutral-300 leading-relaxed prose prose-sm prose-neutral prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {conversationSummary}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 italic">
                  {isGeneratingSummary ? 'Generating summary...' : 'Summary will appear as conversation progresses'}
                </p>
              )}
            </div>
            )}
          </div>

          {!isDesktopLivePanelCollapsed && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tasks Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare size={14} className="text-indigo-400" />
                  Active Tasks ({sessionTasks.length})
                </h3>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  aria-label="Add task"
                >
                  <Plus size={14} className="text-white" />
                </button>
              </div>
              {sessionTasks.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No active tasks</p>
              ) : (
                <div className="space-y-2">
                  {sessionTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2 bg-neutral-800/50 rounded-lg border border-neutral-800 hover:border-indigo-800 transition-all group"
                    >
                      <button
                        onClick={() => toggleTaskCompletion(task.id, !task.completed)}
                        className="mt-0.5 text-neutral-400 hover:text-indigo-400 transition-colors"
                      >
                        <Square size={14} />
                      </button>
                      <div className="flex-1">
                        <span className="text-xs text-neutral-300 block">{task.task}</span>
                        {task.description && (
                          <span className="text-[10px] text-neutral-500 mt-1 block">{task.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Archived Tasks Section */}
            {archivedTasks.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckSquare size={14} />
                  Completed ({archivedTasks.length})
                </h3>
                <div className="space-y-2">
                  {archivedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2 bg-neutral-800/30 rounded-lg border border-neutral-800 opacity-60 hover:opacity-80 transition-opacity group"
                    >
                      <button
                        onClick={() => toggleTaskCompletion(task.id, false)}
                        className="mt-0.5 text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <CheckSquare size={14} />
                      </button>
                      <div className="flex-1">
                        <span className="text-xs text-neutral-500 line-through block">{task.task}</span>
                        {task.description && (
                          <span className="text-[10px] text-neutral-600 mt-1 block line-through">{task.description}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Documents Section */}
            <section>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} className="text-indigo-400" />
                Documents ({sessionDocuments.length})
              </h3>
              {isLoadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-indigo-400" />
                </div>
              ) : sessionDocuments.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No documents yet</p>
              ) : (
                <div className="space-y-2">
                  {sessionDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="group relative p-3 bg-neutral-800/50 rounded-lg border border-neutral-800 hover:border-indigo-800 cursor-pointer transition-all hover:bg-neutral-800"
                    >
                      <h4 className="text-xs font-bold text-neutral-100 mb-1 line-clamp-1">
                        {doc.title}
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        {new Date(doc.updatedAt.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          )}
          
          {!isDesktopLivePanelCollapsed && (
            <div className="mt-auto">
              <DinoRun />
            </div>
          )}
        </aside>

      {/* Live Panel - Mobile Overlay */}
      {showLivePanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-40 lg:hidden"
            onClick={() => setShowLivePanel(false)}
          />
          <aside className="fixed inset-y-0 right-0 w-4/5 bg-neutral-900 border-l border-neutral-800 z-50 flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out">
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-900/30 rounded-lg">
                    <FileText size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight leading-none">Live Docs</h2>
                    <p className="text-[10px] font-bold text-neutral-400 tracking-[0.2em] uppercase mt-1">
                      {sessionDocuments.length} {sessionDocuments.length === 1 ? 'document' : 'documents'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLivePanel(false)}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  aria-label="Close panel"
                >
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>
              {currentSessionId && (
                <p className="text-[10px] text-neutral-500 truncate mb-4">
                  {sessions.find(s => s.id === currentSessionId)?.title || 'Current Session'}
                </p>
              )}
              
              {/* Conversation Summary */}
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Conversation Summary</h3>
                  </div>
                  {isGeneratingSummary && (
                    <Loader2 size={12} className="animate-spin text-indigo-400" />
                  )}
                </div>
                
                {/* Navigation Arrows */}
                {summaryHistory.length > 1 && (
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => navigateSummary('prev')}
                      disabled={currentSummaryIndex <= 0}
                      className={cn(
                        "p-1 rounded hover:bg-neutral-800 transition-colors",
                        currentSummaryIndex <= 0 ? "opacity-30 cursor-not-allowed" : "text-neutral-400 hover:text-indigo-400"
                      )}
                      aria-label="Previous summary"
                    >
                      <ChevronRight size={16} className="rotate-180" />
                    </button>
                    <span className="text-[10px] text-neutral-500">
                      {currentSummaryIndex + 1} / {summaryHistory.length}
                    </span>
                    <button
                      onClick={() => navigateSummary('next')}
                      disabled={currentSummaryIndex >= summaryHistory.length - 1}
                      className={cn(
                        "p-1 rounded hover:bg-neutral-800 transition-colors",
                        currentSummaryIndex >= summaryHistory.length - 1 ? "opacity-30 cursor-not-allowed" : "text-neutral-400 hover:text-indigo-400"
                      )}
                      aria-label="Next summary"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
                
                {conversationSummary ? (
                  <div className="text-sm text-neutral-300 leading-relaxed prose prose-sm prose-neutral prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {conversationSummary}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic">
                    {isGeneratingSummary ? 'Generating summary...' : 'Summary will appear as conversation progresses'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tasks Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare size={14} className="text-indigo-400" />
                    Active Tasks ({sessionTasks.length})
                  </h3>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    aria-label="Add task"
                  >
                    <Plus size={14} className="text-white" />
                  </button>
                </div>
                {sessionTasks.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">No active tasks</p>
                ) : (
                  <div className="space-y-2">
                    {sessionTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 p-2 bg-neutral-800/50 rounded-lg border border-neutral-800 hover:border-indigo-800 transition-all group"
                      >
                        <button
                          onClick={() => toggleTaskCompletion(task.id, !task.completed)}
                          className="mt-0.5 text-neutral-400 hover:text-indigo-400 transition-colors"
                        >
                          <Square size={14} />
                        </button>
                        <div className="flex-1">
                          <span className="text-xs text-neutral-300 block">{task.task}</span>
                          {task.description && (
                            <span className="text-[10px] text-neutral-500 mt-1 block">{task.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Archived Tasks Section */}
              {archivedTasks.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckSquare size={14} />
                    Completed ({archivedTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {archivedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 p-2 bg-neutral-800/30 rounded-lg border border-neutral-800 opacity-60 hover:opacity-80 transition-opacity group"
                      >
                        <button
                          onClick={() => toggleTaskCompletion(task.id, false)}
                          className="mt-0.5 text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <CheckSquare size={14} />
                        </button>
                        <div className="flex-1">
                          <span className="text-xs text-neutral-500 line-through block">{task.task}</span>
                          {task.description && (
                            <span className="text-[10px] text-neutral-600 mt-1 block line-through">{task.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Documents Section */}
              <section>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-indigo-400" />
                  Documents ({sessionDocuments.length})
                </h3>
                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-indigo-400" />
                  </div>
                ) : sessionDocuments.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">No documents yet</p>
                ) : (
                  <div className="space-y-2">
                    {sessionDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          router.push(`/documents/${doc.id}`);
                          setShowLivePanel(false);
                        }}
                        className="group relative p-3 bg-neutral-800/50 rounded-lg border border-neutral-800 hover:border-indigo-800 cursor-pointer transition-all hover:bg-neutral-800"
                      >
                        <h4 className="text-xs font-bold text-neutral-100 mb-1 line-clamp-1">
                          {doc.title}
                        </h4>
                        <p className="text-[10px] text-neutral-500">
                          {new Date(doc.updatedAt.seconds * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </aside>
        </>
      )}

      {/* Agent Creation Modal */}
      {showAgentCreationModal && creatingAgentType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-neutral-800 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-900/30 rounded-lg">
                  <Bot size={20} className="text-indigo-400" />
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  Create New {creatingAgentType === 'team_lead' ? 'Team Lead' : 'Sub-Agent'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowAgentCreationModal(false);
                  setCreatingAgentType(null);
                  setNewAgentName('');
                  setNewAgentDescription('');
                  setNewAgentPrompt('');
                }}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-neutral-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-100 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g., Chief of Staff"
                  className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-100 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="Brief description of this agent's role"
                  className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-100 mb-2">
                  System Prompt *
                </label>
                <textarea
                  value={newAgentPrompt}
                  onChange={(e) => setNewAgentPrompt(e.target.value)}
                  placeholder="Enter the system prompt for this agent..."
                  rows={12}
                  className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAgentCreationModal(false);
                  setCreatingAgentType(null);
                  setNewAgentName('');
                  setNewAgentDescription('');
                  setNewAgentPrompt('');
                }}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newAgentName.trim() || !newAgentPrompt.trim()) {
                    alert('Please fill in agent name and system prompt');
                    return;
                  }
                  try {
                    setIsCreatingAgent(true);
                    const response = await fetch('/api/agents', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: newAgentName,
                        systemPrompt: newAgentPrompt,
                        agentType: creatingAgentType,
                        description: newAgentDescription || undefined,
                      }),
                    });
                    if (response.ok) {
                      await reloadAgents();
                      setShowAgentCreationModal(false);
                      setCreatingAgentType(null);
                      setNewAgentName('');
                      setNewAgentDescription('');
                      setNewAgentPrompt('');
                      alert('Agent created successfully!');
                    } else {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to create agent');
                    }
                  } catch (error: any) {
                    console.error('Error creating agent:', error);
                    alert(`Failed to create agent: ${error.message}`);
                  } finally {
                    setIsCreatingAgent(false);
                  }
                }}
                disabled={isCreatingAgent || !newAgentName.trim() || !newAgentPrompt.trim()}
                className={cn(
                  "px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors",
                  isCreatingAgent || !newAgentName.trim() || !newAgentPrompt.trim()
                    ? "bg-neutral-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {isCreatingAgent ? (
                  <>
                    <Loader2 size={16} className="inline-block animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  return (
    <main>
      <ChatInterface />
    </main>
  );
}
