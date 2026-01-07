"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Loader2, FileText, Zap, Menu, X, Bot, Users, Search, PenTool, Info, ShieldCheck, Sparkles, Activity } from 'lucide-react';
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

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

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

  useEffect(() => {
    if (docId) {
      loadDocument();
    }
  }, [docId]);

  const loadDocument = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/documents?docId=${docId}`);
      if (response.ok) {
        const data = await response.json();
        setDocument(data.document);
      } else {
        console.error('Document not found');
      }
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <FileText size={64} className="mx-auto text-neutral-700 mb-4" />
          <h2 className="text-xl font-bold text-neutral-100 mb-2">
            Document not found
          </h2>
          <button
            onClick={() => router.push('/documents')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

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
                href="/documents"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
              >
                <FileText size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Documents</span>
              </a>
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
                    href="/documents"
                    onClick={() => setShowMobileSidebar(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer group"
                  >
                    <FileText size={18} className="text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-100 transition-colors">Documents</span>
                  </a>
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
              onClick={() => router.push('/documents')}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Back to documents"
            >
              <ArrowLeft size={20} className="text-neutral-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Zap className="text-white w-6 h-6 fill-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight line-clamp-2">
                  {document.title}
                </h1>
                <p className="text-sm text-neutral-400">
                  {new Date(document.updatedAt.seconds * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 md:p-12">
            <div className="prose prose-neutral max-w-none prose-invert prose-p:leading-relaxed prose-a:no-underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {document.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
