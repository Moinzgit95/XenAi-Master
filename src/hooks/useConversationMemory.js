
// hooks/useConversationMemory.js
import { useState, useCallback } from 'react';

export const useConversationMemory = (apiEndpoint = '/api/getChatResponse') => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async (conversationId = 'default') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiEndpoint}?conversationId=${conversationId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint]);

  const clearMemory = useCallback(async (conversationId = 'default') => {
    try {
      const response = await fetch(`${apiEndpoint}?conversationId=${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSummary(null);
      return await response.json();
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [apiEndpoint]);

  return {
    summary,
    isLoading,
    error,
    fetchSummary,
    clearMemory,
  };
};
