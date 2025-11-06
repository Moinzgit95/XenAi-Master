'use client';

import { FadeIn, SlideIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { useState, useCallback } from 'react';

const testimonials = [
  {
    id: "1",
    quote: "Xen.ai is at least a 2x improvement over Copilot. It's amazing having an AI pair programmer, and is an incredible accelerator for me and my team.",
    author: "Syed Abdulla",
  },
  {
    id: "2",
    quote: "The Xen.ai tab completion while coding is occasionally so magic it defies reality - about ~25% of the time it is anticipating exactly what I want to do. It is enough to make you believe that eventually you'll be able to code at the speed of thought.",
    author: "Moin Ahmed",
  },
  {
    id: "3",
    quote: "Xen.ai is hands down my biggest workflow improvement in years",
    author: "Sumit",
  },
  {
    id: "4",
    quote: "I love writing code and Xen.ai is a necessity. Xen.ai is steps ahead of my brain, proposing multi-line edits so I type tab more than anything else.",
    author: "Prathap Sharma",
  },
  {
    id: "5",
    quote: "Xen.ai is so good, and literally gets better/more feature-rich every couple of weeks.",
    author: "Suhas J",
  },
  {
    id: "6",
    quote: "Xen.ai is awesome! Someone finally put GPT into a code editor in a seamless way. It's so elegant and easy. No more copying and pasting. I'm an hour in and already hooked.",
    author: "Riya",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-teal-500/20" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <FadeIn className="max-w-4xl mx-auto mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by world-class devs
          </h2>
          <SlideIn delay={0.2}>
            <p className="text-lg text-white/80">
              Engineers all around the world reach for Xen.ai by choice.
            </p>
          </SlideIn>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <ShineCard key={testimonial.id} delay={0.05 * index}>
              <blockquote className="mb-4">
                <p className="text-white/80 italic">"{testimonial.quote}"</p>
              </blockquote>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-medium text-sm">
                  {testimonial.author.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="font-medium">{testimonial.author}</p>
                  <p className="text-sm text-white/60">{testimonial.company}</p>
                </div>
              </div>
            </ShineCard>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function ShineCard({ children, delay = 0 }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handleMove = useCallback((e) => {
    const target = e.currentTarget.getBoundingClientRect();
    setCoords({ x: e.clientX - target.left, y: e.clientY - target.top });
  }, []);

  return (
    <StaggerItem
      delay={delay}
      className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:scale-[1.02]"
      onMouseMove={handleMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={() => setActive(true)}
      style={{
        '--x': `${coords.x}px`,
        '--y': `${coords.y}px`,
      }}
    >
      {/* Shine gradient that follows cursor */}
      <div
        className={`pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        style={{
          background: `radial-gradient(500px circle at var(--x) var(--y), rgba(168,85,247,0.25), rgba(59,130,246,0.18), rgba(56,189,248,0.12), transparent 60%)`,
          mixBlendMode: 'screen',
          opacity: active ? 1 : undefined,
        }}
      />

      {/* Subtle inner glow for depth */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-purple-500/0 via-blue-500/0 to-teal-400/0 group-hover:from-purple-500/[0.04] group-hover:to-teal-400/[0.04] transition-colors duration-300" />

      <div className="relative z-10 p-6">
        {children}
      </div>
    </StaggerItem>
  );
}