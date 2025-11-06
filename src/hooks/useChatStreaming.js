// hooks/useChatStreaming.js
import { useState, useCallback, useRef } from 'react';

export const useChatStreaming = (apiEndpoint = '/api/getChatResponse') => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState(null);
  const abortControllerRef = useRef(null);

  const streamChat = useCallback(async (
    message, 
    conversationId = 'default', 
    callbacks = {}
  ) => {
    const { onChunk, onComplete, onError, onStart, onProvider } = callbacks;
    
    if (isStreaming) {
      console.warn('Already streaming, ignoring new request');
      return;
    }

    setIsStreaming(true);
    setStreamingError(null);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    if (onStart) onStart();

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, conversationId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'chunk':
                  fullResponse += data.content;
                  chunkCount++;
                  if (onChunk) onChunk(data.content, fullResponse, chunkCount);
                  break;
                
                case 'complete':
                  if (onComplete) onComplete(data.fullResponse, data.conversationId, data.totalChunks);
                  break;
                
                case 'provider':
                  if (onProvider) onProvider({ provider: data.provider, model: data.model, latencyMs: data.latencyMs });
                  break;

                case 'error':
                  const error = new Error(data.error);
                  setStreamingError(error);
                  if (onError) onError(error);
                  break;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Streaming aborted');
      } else {
        setStreamingError(error);
        if (onError) onError(error);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming, apiEndpoint]);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    streamChat,
    isStreaming,
    streamingError,
    cancelStreaming,
  };
};
