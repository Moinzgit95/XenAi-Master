"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { auth, firestore } from "@/config/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  doc,
  getDocs,
  where,
  updateDoc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ClipboardDocumentIcon, CheckIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { MessageSquarePlus, Send, Sparkles, Trash, Trash2, X, XCircle, Clock, FileText, Zap, StopCircle, Brain, Bot, User, Copy, Check } from "lucide-react";

// Import the custom hooks
import { useChatStreaming } from '@/hooks/useChatStreaming';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { useMessageParser } from '@/hooks/useMessageParser';
import { useChatAnalytics } from '@/hooks/useChatAnalytics';

function Chatroom({ workspaceId, setIsChatOpen }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [providerInfo, setProviderInfo] = useState({ provider: 'gemini', model: 'gemini-2.0-flash' });

  const userId = auth.currentUser?.uid;
  const name = auth.currentUser?.displayName || "Anonymous";
  const conversationId = `workspace_${workspaceId}`;

  const messagesRef = collection(firestore, "messages");
  const messagesQuery = query(messagesRef, orderBy("createdAt"));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Use the custom hooks
  const { streamChat, isStreaming, streamingError, cancelStreaming } = useChatStreaming('/api/getChatResponse');
  const { summary, isLoading: summaryLoading, fetchSummary, clearMemory } = useConversationMemory('/api/getChatResponse');
  const analytics = useChatAnalytics(messages);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end" 
      });
    }
  }, []);

  useEffect(() => {
    if (!workspaceId || !userId) return;

    setLoading(true);
    
    const unsubscribe = onSnapshot(
      messagesQuery, 
      (snapshot) => {
        const messagesData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((msg) => msg.workspaceId === workspaceId)
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return aTime - bTime;
          });

        setMessages(messagesData);
        setLoading(false);
        setIsConnected(true);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setIsConnected(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [workspaceId, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  const generateAIResponseWithStreaming = async (prompt) => {
    // Create streaming message state instead of Firebase document
    const tempStreamingMessage = {
      id: `streaming_${Date.now()}`,
      text: "",
      createdAt: new Date(),
      imageUrl: "/ai-avatar.png",
      userId: "AI_BOT",
      name: "CodeBot",
      workspaceId,
      isStreaming: true,
      isTemporary: true
    };
    
    setStreamingMessage(tempStreamingMessage);

    try {
      await streamChat(
        prompt,
        conversationId,
        {
          onStart: () => {
            console.log('🚀 Streaming started');
          },
          onProvider: (info) => {
            setProviderInfo(info || { provider: 'gemini', model: 'gemini-2.0-flash' });
          },
          onChunk: (chunk, fullResponse, chunkCount) => {
            setStreamingMessage(prev => ({
              ...prev,
              text: `🤖 ${fullResponse}`,
              chunkCount
            }));
          },
          onComplete: async (finalResponse, convId, totalChunks) => {
            try {
              // Create the final permanent message
              await addDoc(messagesRef, {
                text: `🤖 ${finalResponse}`,
                createdAt: serverTimestamp(),
                imageUrl: "/ai-avatar.png",
                userId: "AI_BOT",
                name: "CodeBot",
                workspaceId,
                isStreaming: false,
                totalChunks,
              });

              // Clear streaming state
              setStreamingMessage(null);
              console.log('✅ Streaming completed');
              
              // Focus back to input
              setTimeout(() => inputRef.current?.focus(), 100);
            } catch (error) {
              console.error("Error saving final message:", error);
              setStreamingMessage(null);
            }
          },
          onError: async (error) => {
            console.error("❌ Streaming error:", error);
            
            try {
              // Create error message
              await addDoc(messagesRef, {
                text: "🤖 Sorry, I encountered an error processing your request. Please try again later.",
                createdAt: serverTimestamp(),
                imageUrl: "/ai-avatar.png",
                userId: "AI_BOT",
                name: "CodeBot",
                workspaceId,
                isStreaming: false,
                isError: true,
              });
            } catch (dbError) {
              console.error("Error saving error message:", dbError);
            }

            setStreamingMessage(null);
          }
        }
      );
    } catch (error) {
      console.error("Error with streaming setup:", error);
      setStreamingMessage(null);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;
    
    const messageText = newMessage.trim();
    const imageUrl = auth.currentUser?.photoURL;
    const aiMatch = messageText.match(/@X(.+)/);
    const aiPrompt = aiMatch?.[1]?.trim();
    
    // Clear input immediately for better UX
    setNewMessage("");

    try {
      // Always send the user message first
      await addDoc(messagesRef, {
        text: messageText,
        createdAt: serverTimestamp(),
        imageUrl,
        userId,
        name,
        workspaceId,
      });

      // If there's an AI prompt, generate response
      if (aiPrompt) {
        await generateAIResponseWithStreaming(aiPrompt);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message if failed
      setNewMessage(messageText);
    }
  };

  const clearChat = async () => {
    if (!window.confirm("Are you sure you want to clear all messages? This action cannot be undone.")) {
      return;
    }

    try {
      const querySnapshot = await getDocs(
        query(messagesRef, where("workspaceId", "==", workspaceId))
      );

      const deletePromises = querySnapshot.docs.map((docItem) => 
        deleteDoc(doc(messagesRef, docItem.id))
      );
      await Promise.all(deletePromises);
      
      // Clear conversation memory
      await clearMemory(conversationId);
      
      setMessages([]);
      setStreamingMessage(null);
      
      console.log('🧹 Chat cleared successfully');
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const handleCancelStreaming = () => {
    cancelStreaming();
    setStreamingMessage(null);
    console.log('⏹️ Streaming cancelled by user');
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        sendMessage();
      }
    }
  };

  const MessageBubble = ({ msg, isStreamingMsg = false }) => {
    const isCurrentUser = msg.userId === userId;
    const isAI = msg.userId === "AI_BOT";
    const [copiedStates, setCopiedStates] = useState({});

    // Use the message parser hook
    const parsedMessage = useMessageParser(msg.text || "");

    const copyToClipboard = async (code, blockId) => {
      try {
        await navigator.clipboard.writeText(code);
        setCopiedStates(prev => ({ ...prev, [blockId]: true }));
        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, [blockId]: false }));
        }, 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    };

    return (
      <div className={`group flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300 ${
        isCurrentUser ? "items-end" : isAI ? "items-start w-full" : "items-start"
      }`}>
        {/* Message Header */}
        {!isAI && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              {isCurrentUser ? "You" : msg.name}
            </span>
            <span className="text-xs text-gray-500">
              {msg.createdAt?.toDate?.()?.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }) || "now"}
            </span>
          </div>
        )}

        <div className="flex items-start gap-3 max-w-full">
          {/* Avatar */}
          {!isCurrentUser && (
            <div className="flex-shrink-0">
              {isAI ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-lg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              ) : (
                <img
                  src={msg.imageUrl || "/robotic.png"}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover shadow-sm"
                />
              )}
            </div>
          )}

          {/* Message Content */}
          <div className={`relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
            isAI 
              ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gray-600/30 backdrop-blur-sm" +
                (msg.isError ? " border-red-400/50 from-red-900/20 to-red-800/20" : "")
              : isCurrentUser 
                ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                : "bg-gradient-to-br from-gray-700 to-gray-800 text-gray-100"
          }`}>
            
            {/* AI Status Header */}
            {isAI && (
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-600/30">
                <div className="flex items-center gap-2">
                  {isStreamingMsg ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        <span className="text-xs text-yellow-400 ml-1">Streaming</span>
                      </div>
                      {msg.chunkCount && (
                        <span className="text-xs text-gray-400">
                          · {msg.chunkCount} chunks
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-green-400 font-medium">CodeBot</span>
                      {msg.totalChunks && (
                        <span className="text-xs text-gray-400">
                          · {msg.totalChunks} chunks processed
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {isStreamingMsg && isStreaming && (
                  <button
                    onClick={handleCancelStreaming}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-900/20 transition-colors"
                  >
                    <StopCircle className="h-3 w-3" />
                    Stop
                  </button>
                )}
              </div>
            )}

            {/* Message Content */}
            <div className="space-y-2">
              {parsedMessage.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <div key={index} className="whitespace-pre-wrap text-sm leading-relaxed">
                      {part.content}
                    </div>
                  );
                }

                if (part.type === 'codeblock') {
                  const blockId = `${msg.id}_${part.id}_${index}`;
                  return (
                    <div key={blockId} className="relative group/code">
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                        <div className="flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded text-xs text-gray-300">
                          {part.lang}
                        </div>
                        <button
                          onClick={() => copyToClipboard(part.code, blockId)}
                          className="p-1.5 rounded bg-gray-800/80 hover:bg-gray-700/80 transition-colors"
                          title="Copy code"
                        >
                          {copiedStates[blockId] ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-300" />
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={part.lang || 'text'}
                        style={vscDarkPlus}
                        customStyle={{
                          background: '#0a0a0a',
                          borderRadius: '0.75rem',
                          padding: '1rem',
                          margin: '0.5rem 0',
                          fontSize: '0.875rem',
                          lineHeight: '1.5'
                        }}
                        codeTagProps={{ 
                          style: { 
                            fontFamily: 'JetBrains Mono, Fira Code, monospace',
                          } 
                        }}
                      >
                        {part.code}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                if (part.type === 'inlinecode') {
                  return (
                    <code
                      key={index}
                      className="bg-gray-800/60 text-gray-200 px-2 py-1 rounded-md text-sm font-mono border border-gray-700/50"
                    >
                      {part.code}
                    </code>
                  );
                }

                return null;
              })}
            </div>

            {/* Message Footer */}
            {isAI && !isStreamingMsg && (
              <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-600/20 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  AI response completed
                </div>
                {streamingError && (
                  <span className="text-red-400">Error: {streamingError.message}</span>
                )}
              </div>
            )}
          </div>

          {/* Current User Avatar */}
          {isCurrentUser && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-600"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 absolute inset-0"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-300">Loading chat...</p>
            <p className="text-sm text-gray-500">Fetching conversation history</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col h-full border border-gray-600/50 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        backgroundImage: "url('/Assests/chat-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Darken background for readability without altering the image */}
      <div className="pointer-events-none absolute inset-0 bg-black/45" />

      {/* Content wrapper */}
      <div className="relative flex flex-col h-full">
      
      {/* Enhanced Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-b border-gray-600/50 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                Xen.ai Chat
                <span className="text-indigo-400 text-sm font-normal px-2 py-1 bg-indigo-900/30 rounded-full">
                  v3.0
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </div>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{
                    backgroundColor: providerInfo.provider === 'gemini' ? '#1BA1E3' : providerInfo.provider === 'cohere' ? '#b06cff' : '#14b8a6'
                  }} />
                  {`Powered by ${providerInfo.provider === 'openrouter' ? `OpenRouter (${providerInfo.model})` : providerInfo.provider.charAt(0).toUpperCase() + providerInfo.provider.slice(1)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Analytics */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 rounded-lg text-blue-300 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {analytics.totalMessages}
            </div>
            <div className="px-2 py-1 bg-green-900/30 border border-green-500/30 rounded-lg text-green-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {analytics.aiMessages}
            </div>
          </div>

          {/* Action Buttons */}
          <Button
            onClick={clearChat}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Clear</span>
          </Button>

          <Button
            onClick={() => setIsChatOpen(false)}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gradient-to-b from-gray-800/20 to-gray-900/40">
        {messages.length === 0 && !streamingMessage ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="mb-6 relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
                <MessageSquarePlus className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-200 mb-2">Start Your AI Conversation</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Type <code className="bg-gray-800 px-2 py-1 rounded text-indigo-400">@</code> followed by your question to chat with our AI assistant
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-400" />
                Real-time streaming
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                Conversation memory
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-400" />
                Code highlighting
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            
            {streamingMessage && (
              <MessageBubble 
                key={streamingMessage.id} 
                msg={streamingMessage} 
                isStreamingMsg={true} 
              />
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Section */}
      <div className="p-4 border-t border-gray-600/30 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? "AI is responding..." : "Type your message... (@X for AI)"}
                disabled={isStreaming}
                className="w-full bg-gray-800/60 border border-gray-600/50 text-gray-200 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent pr-12 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              
              {/* Input indicators */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {newMessage.includes('@') && (
                  <Brain className="h-4 w-4 text-indigo-400 animate-pulse" />
                )}
                {isStreaming && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                )}
              </div>
            </div>
            
            {isStreaming ? (
              <Button
                type="button"
                onClick={handleCancelStreaming}
                className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-6 py-3 flex items-center gap-2 transition-all hover:scale-105 shadow-lg"
              >
                <StopCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-6 py-3 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            )}
          </div>
          
          {/* Status bar */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Enhanced AI Chat
              </span>
              {streamingError && (
                <span className="text-red-400">• {streamingError.message}</span>
              )}
            </div>
            <span className="hidden sm:inline">Enter to send • Shift+Enter for new line</span>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

export default Chatroom;