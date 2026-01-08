"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import ChatInterface from '@/app/components/ChatInterface';

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const chatId = params.chatId as string;

  return <ChatInterface projectId={projectId} projectChatId={chatId} />;
}

