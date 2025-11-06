'use client';

import { motion } from 'framer-motion';
import { Code, Brain, Zap, Users, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FadeIn, ScaleIn, SlideIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import Header from '@/components/sections/Header';

export default function Features() {
  const videoFeatures = [
    {
      id: 'workspaces',
      title: 'Multiple Workspaces',
      description: 'Effortlessly create and manage multiple workspaces for different projects, keeping your work organized and accessible.',
      videoUrl: '/Assests/Dashboard.mp4',
    },
    {
      id: 'file-folder',
      title: 'File & Folder Management',
      description: 'Organize your codebase with intuitive file and folder creation, making project navigation seamless and efficient.',
      videoUrl: '/Assests/FileFolder.mp4',
    },
    {
      id: 'collaboration',
      title: 'Team Collaboration',
      description: 'Invite multiple collaborators to your workspace and work together in real-time for maximum productivity.',
      videoUrl: '/Assests/Invite.mp4',
    },
    {
      id: 'onboarding',
      title: 'Seamless Onboarding',
      description: 'Accept workspace invitations instantly and get started with your team without any hassle.',
      videoUrl: '/Assests/AcceptInvite.mp4',
    },
    {
      id: 'team-chat',
      title: 'Team Chat',
      description: 'Initiate and manage conversations with your team directly within the editor for smooth communication.',
      videoUrl: '/Assests/Chat.mp4',
    },
    {
      id: 'instant-responses',
      title: 'Instant Responses',
      description: 'Experience real-time chat responses to keep your workflow uninterrupted and your team in sync.',
      videoUrl: '/Assests/Chatresponse.mp4',
    },
    {
      id: 'ai-chat',
      title: 'AI Chat Assistant',
      description: 'Get instant coding help and suggestions by chatting with Xen.ai (@X), your AI-powered assistant.',
      videoUrl: '/Assests/AICHAT.mp4',
    },
  ];

  const features = [
    {
      icon: <Code className="h-6 w-6" />,
      title: 'Advanced Code Editor',
      description: 'Powerful code editing with syntax highlighting, auto-completion, and real-time collaboration features.'
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: 'AI-Powered Assistance',
      description: 'Get intelligent code suggestions, bug detection, and automated code reviews powered by advanced AI.'
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Real-Time Collaboration',
      description: 'Work together seamlessly with team members in real-time with live cursors and instant updates.'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Team Management',
      description: 'Easily manage team access, roles, and permissions within your workspaces.'
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Secure Environment',
      description: 'Enterprise-grade security with encrypted data storage and secure authentication.'
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'Smart Integrations',
      description: 'Seamlessly integrate with your favorite development tools and version control systems.'
    }
  ];

  return (
    <div className="min-h-screen text-white">
      <Header />
      <div className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
            Powerful Features for Modern Development
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Experience the next generation of collaborative coding with our cutting-edge features
          </p>
        </motion.div>



        <div className="space-y-24">
          {videoFeatures.map((feature, index) => (
            <FadeIn
              key={feature.id}
              delay={0.2 * index}
              className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}
            >
              <SlideIn
                className="w-full md:w-1/2"
                direction={index % 2 === 0 ? 'left' : 'right'}
                delay={0.2 + 0.1 * index}
              >
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  {feature.title}
                </h3>
                <p className="text-lg text-white/80 mb-6">
                  {feature.description}
                </p>
              </SlideIn>
              <ScaleIn
                className="w-full md:w-1/2 relative"
                delay={0.3 + 0.1 * index}
              >
                <div className="rounded-lg overflow-hidden border border-white/10 shadow-2xl relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/30 via-purple-600/30 to-teal-600/30 opacity-50" />
                  <div className="w-full h-8 bg-zinc-900 flex items-center px-4 relative z-10">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <div className="bg-black w-full relative">
                    <video
                      src={feature.videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto block bg-black"
                    />
                  </div>
                </div>
              </ScaleIn>
            </FadeIn>
          ))}
        </div>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          {[
            {
              title: "Frontier Intelligence",
              description: "Powered by a mix of purpose-built and frontier models, Xen.ai is smart and fast."
            },
            {
              title: "Feels Familiar",
              description: "Import all your extensions, themes, and keybindings in one click."
            },
            {
              title: "Privacy Options",
              description: "If you enable Privacy Mode, your code is never stored remotely. Xen.ai is SOC 2 certified."
            }
          ].map((card, index) => (
            <StaggerItem
              key={card.title}
              delay={0.1 * index}
              className="group relative"
            >
              {/* Animated gradient border wrapper */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                   style={{
                     background: 'linear-gradient(45deg, #fbbf24, #f97316, #ec4899, #8b5cf6, #3b82f6, #14b8a6)',
                     backgroundSize: '400% 400%',
                     animation: 'gradientShift 3s ease infinite',
                     padding: '2px'
                   }}>
                {/* Inner div to mask the gradient and create border effect */}
                <div className="w-full h-full bg-zinc-900/50 rounded-lg"></div>
              </div>
              
              {/* Main card content - positioned above the gradient border */}
              <div className="relative bg-zinc-900/50 rounded-lg p-6 border border-white/10 group-hover:border-transparent transition-all duration-300 z-10">
                <h3 className="text-xl font-bold mb-3 text-white">{card.title}</h3>
                <p className="text-white/80">
                  {card.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </div>
  );
}