"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Trash2, ChevronRight, Zap, ArrowLeft, Menu, X, Plus, Users, Bot, Activity, Search, PenTool, Info, ShieldCheck, Sparkles, FolderKanban } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: any[]) => {
  return twMerge(clsx(inputs));
};

type Document = {
  id: string;
  title: string;
  content: string;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
  agent?: string;
};

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this document? This cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/documents?docId=${docId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleDocumentClick = (doc: Document) => {
    // Create a URL-safe slug from the title
    const slug = encodeURIComponent(doc.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
    router.push(`/documents/${doc.id}`);
  };

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

  return (
    <div className="flex h-screen bg-neutral-950 font-sans text-neutral-100">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex flex-col w-72 bg-neutral-900 border-r border-neutral-800 transition-all duration-300">
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-none transition-transform hover:rotate-3">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none">LAUNCH</h2>
              <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase mt-1">Team Control</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Navigation</h3>
            <div className="space-y-2">
              <a
                href="/"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
              >
                <ArrowLeft size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Back to Chat</span>
              </a>
              <a
                href="/projects"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
              >
                <FolderKanban size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Projects</span>
              </a>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-900/20 border border-indigo-800 cursor-pointer">
                <FileText size={18} className="text-indigo-400" />
                <span className="text-xs font-medium text-indigo-400">Documents</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Hierarchical Team</h3>
            <div className="space-y-3">
              {agentOptions.map((agent) => (
                <div 
                  key={agent.id} 
                  className="flex items-center gap-3 p-2 rounded-lg transition-all duration-300 opacity-70 group hover:opacity-100 hover:bg-neutral-800"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm", agent.color)}>
                    <agent.icon size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{agent.name}</p>
                    <p className="text-[10px] text-neutral-500">{agent.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-neutral-800">
          <div className="flex items-center gap-3 text-neutral-400">
            <ShieldCheck size={18} />
            <span className="text-xs font-medium">Enterprise Security Active</span>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {showMobileSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-80 bg-neutral-900 border-r border-neutral-800 z-50 flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out">
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
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Navigation</h3>
                <div className="space-y-2">
                  <a
                    href="/"
                    onClick={() => setShowMobileSidebar(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
                  >
                    <ArrowLeft size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Back to Chat</span>
                  </a>
                  <a
                    href="/projects"
                    onClick={() => setShowMobileSidebar(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
                  >
                    <FolderKanban size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Projects</span>
                  </a>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-900/20 border border-indigo-800 cursor-pointer">
                    <FileText size={18} className="text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-400">Documents</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Hierarchical Team</h3>
                <div className="space-y-3">
                  {agentOptions.map((agent) => (
                    <div 
                      key={agent.id} 
                      className="flex items-center gap-3 p-2 rounded-lg transition-all duration-300 opacity-70 group hover:opacity-100 hover:bg-neutral-800"
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm", agent.color)}>
                        <agent.icon size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold">{agent.name}</p>
                        <p className="text-[10px] text-neutral-500">{agent.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-neutral-800">
              <div className="flex items-center gap-3 text-neutral-400">
                <ShieldCheck size={18} />
                <span className="text-xs font-medium">Enterprise Security Active</span>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white w-5 h-5 fill-white" />
            </div>
            <h1 className="text-base font-black uppercase tracking-tighter">Launch Hub</h1>
          </div>
          <button 
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 text-neutral-500 hover:text-neutral-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Back to chat"
            >
              <ArrowLeft size={20} className="text-neutral-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Zap className="text-white w-6 h-6 fill-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Documents</h1>
                <p className="text-sm text-neutral-400">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={64} className="mx-auto text-neutral-700 mb-4" />
            <h2 className="text-xl font-bold text-neutral-100 mb-2">
              No documents yet
            </h2>
            <p className="text-neutral-400 mb-6">
              Save messages from your conversations to create documents.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go to Chat
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className="group relative p-6 bg-neutral-900 rounded-xl border border-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <button
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-neutral-100 mb-2 line-clamp-2">
                  {doc.title}
                </h3>
                
                <p className="text-sm text-neutral-400 mb-4 line-clamp-3">
                  {doc.content.slice(0, 150)}...
                </p>
                
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>
                    {new Date(doc.updatedAt.seconds * 1000).toLocaleDateString()}
                  </span>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
