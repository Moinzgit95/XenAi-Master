
// hooks/useChatAnalytics.js
import { useState, useEffect } from 'react';

export const useChatAnalytics = (messages) => {
  const [analytics, setAnalytics] = useState({
    totalMessages: 0,
    userMessages: 0,
    aiMessages: 0,
    codeBlocks: 0,
    averageResponseTime: 0,
    topicsDiscussed: [],
  });

  useEffect(() => {
    const userMessages = messages.filter(msg => msg.userId !== 'AI_BOT');
    const aiMessages = messages.filter(msg => msg.userId === 'AI_BOT');
    
    // Count code blocks
    const codeBlocks = messages.reduce((count, msg) => {
      const matches = msg.text.match(/```[\s\S]*?```/g);
      return count + (matches ? matches.length : 0);
    }, 0);

    // Extract topics (simple keyword extraction)
    const topics = new Set();
    messages.forEach(msg => {
      const words = msg.text.toLowerCase().split(/\s+/);
      const techKeywords = ['react', 'javascript', 'python', 'css', 'html', 'node', 'api', 'database', 'sql'];
      words.forEach(word => {
        if (techKeywords.includes(word.replace(/[^\w]/g, ''))) {
          topics.add(word.replace(/[^\w]/g, ''));
        }
      });
    });

    setAnalytics({
      totalMessages: messages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      codeBlocks,
      averageResponseTime: 0, // Would need timestamps to calculate
      topicsDiscussed: Array.from(topics).slice(0, 5),
    });
  }, [messages]);

  return analytics;
};