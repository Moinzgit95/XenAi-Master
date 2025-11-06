'use client';

import { motion } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import React from 'react';

export function FadeIn({
  children,
  className = '',
  delay = 0,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  ...props
}) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'left':
        return { x: -50, y: 0 };
      case 'right':
        return { x: 50, y: 0 };
      case 'up':
        return { x: 0, y: -50 };
      case 'down':
        return { x: 0, y: 50 };
      default:
        return { x: 0, y: 50 };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPosition() }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 1, delay, type: "spring", stiffness: 100, damping: 20 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  className = '',
  delay = 0,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className = '',
  ...props
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
  delay = 0,
  ...props
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function GradientButton({
  children,
  className = '',
  onClick,
  asChild = false,
  ...props
}) {
  const Component = asChild ? motion(Slot) : motion.button;
  return (
    <Component
      className={className}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}