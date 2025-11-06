'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/sections/Header';

export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '0',
      description: 'Perfect for individual developers',
      features: [
        'Basic code editor features',
        'Limited AI assistance',
        'Public workspaces',
        'Community support'
      ]
    },
    {
      name: 'Pro',
      price: '19',
      description: 'Ideal for professional developers',
      features: [
        'Advanced code editor features',
        'Full AI assistance',
        'Private workspaces',
        'Real-time collaboration',
        'Priority support',
        'Custom integrations'
      ],
      stripe: true
    },
    {
      name: 'Team',
      price: '49',
      description: 'Best for teams and organizations',
      features: [
        'Everything in Pro',
        'Team management',
        'Advanced security features',
        'Custom roles & permissions',
        'Dedicated support',
        'Enterprise integrations',
        'Usage analytics'
      ],
      stripe: true
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
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Get started with the perfect plan for your development needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-8 border border-gray-700 hover:border-blue-500/70 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-105"
            >
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline mb-4">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-gray-400 mb-6">{plan.description}</p>
              <Button className="w-full mb-4" variant={index === 1 ? 'default' : 'outline'}>
                Get Started
              </Button>
              {plan.stripe && (
                <a href="https://buy.stripe.com/test_4gwcNw0Qw0Qw0Qw4gg" target="_blank" rel="noopener noreferrer">
                  <Button className="w-full mb-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold">
                    Buy Now
                  </Button>
                </a>
              )}
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-gray-300">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}