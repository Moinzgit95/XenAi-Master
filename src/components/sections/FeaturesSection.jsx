'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FadeIn, ScaleIn, SlideIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';

const features = [
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

export default function FeaturesSection() {
  return (
    <section className="py-20 overflow-hidden relative">
      {/* Removed gradient overlay to reveal site-wide background */}
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <FadeIn className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-8">
            Tab, tab, tab
          </h2>
          <SlideIn delay={0.2}>
            <p className="text-lg md:text-xl text-white/80 text-center">
              Xen.ai lets you breeze through changes by predicting your next edit.
            </p>
          </SlideIn>
        </FadeIn>

        <div className="space-y-24">
          {features.map((feature, index) => (
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
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
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
                  {/* Gradient background for the code editor */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/30 via-purple-600/30 to-teal-600/30 opacity-50" />
                  
                  {/* Editor window chrome */}
                  <div className="w-full h-8 bg-zinc-900 flex items-center px-4 relative z-10">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  
                  {/* Editor content */}
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

        <FadeIn className="max-w-lg mx-auto text-center mt-20">
          <SlideIn delay={0.5} direction="up">
            <Link href="/dashboard">
              <Button variant="outline" className="mt-6">
                See more features
              </Button>
            </Link>
          </SlideIn>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
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
              className="bg-zinc-900/50 rounded-lg p-6 border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <h3 className="text-xl font-bold mb-3">{card.title}</h3>
              <p className="text-white/80">
                {card.description}
              </p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}