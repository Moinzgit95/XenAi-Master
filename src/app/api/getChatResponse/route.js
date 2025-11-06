import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// In-memory storage
const conversationMemories = new Map();

// --- Provider/key rotation setup (server-only) ---
const parseKeys = (value) => (value || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const providers = {
  gemini: {
    keys: parseKeys(process.env.GEMINI_API_KEYS) || [],
    // fallback to existing public key if no server-only list provided
    get allKeys() {
      const arr = this.keys.length ? this.keys : (process.env.NEXT_PUBLIC_GEMINI_API_KEY ? [process.env.NEXT_PUBLIC_GEMINI_API_KEY] : []);
      return arr;
    },
    idx: 0,
    used: [],
    limitPerKey: 40,
  },
  cohere: {
    keys: parseKeys(process.env.COHERE_API_KEYS),
    idx: 0,
    used: [],
    limitPerKey: Infinity,
  },
  openrouter: {
    keys: parseKeys(process.env.OPENROUTER_API_KEYS),
    idx: 0,
    used: [],
    limitPerKey: Infinity,
  },
};

// Cooldown timestamp for Cohere trial rate limit (skip cohere for 60s after hitting 429)
let cohereCooldownUntil = 0;
// OpenRouter: cooldown when daily free quota is hit; skip OR entirely during this window
let openrouterCooldownUntil = 0;
// OpenRouter: remember models that 404 (no endpoints) for 10 minutes
const openrouterNoEndpoint = new Map(); // model -> expiresAt

function selectProvider() {
  // Prefer Gemini until per-key limit reached across all keys, then Cohere, then HF
  const gKeys = providers.gemini.allKeys;
  if (gKeys.length) {
    // find first key with usage < limit
    for (let i = 0; i < gKeys.length; i++) {
      const kIdx = (providers.gemini.idx + i) % gKeys.length;
      const used = providers.gemini.used[kIdx] || 0;
      if (used < providers.gemini.limitPerKey) {
        providers.gemini.idx = kIdx; // advance pointer
        return { name: 'gemini', key: gKeys[kIdx], keyIndex: kIdx };
      }
    }
  }
  if (providers.cohere.keys.length) {
    const kIdx = providers.cohere.idx % providers.cohere.keys.length;
    providers.cohere.idx = (kIdx + 1) % providers.cohere.keys.length;
    return { name: 'cohere', key: providers.cohere.keys[kIdx], keyIndex: kIdx };
  }
  if (providers.openrouter.keys.length) {
    const kIdx = providers.openrouter.idx % providers.openrouter.keys.length;
    providers.openrouter.idx = (kIdx + 1) % providers.openrouter.keys.length;
    return { name: 'openrouter', key: providers.openrouter.keys[kIdx], keyIndex: kIdx };
  }
  throw new Error("No API keys configured for chat providers");
}

function recordUsage(provider, keyIndex) {
  if (provider === 'gemini') {
    providers.gemini.used[keyIndex] = (providers.gemini.used[keyIndex] || 0) + 1;
  } else if (provider === 'cohere') {
    providers.cohere.used[keyIndex] = (providers.cohere.used[keyIndex] || 0) + 1;
  } else if (provider === 'openrouter') {
    providers.openrouter.used[keyIndex] = (providers.openrouter.used[keyIndex] || 0) + 1;
  }
}

// Note: model instances will be created per-request to plug-in the selected key
const DEFAULT_MODEL = "gemini-2.0-flash";
const SUMMARY_MODEL = "gemini-1.5-flash";

// Enhanced chat prompt template
const chatPrompt = ChatPromptTemplate.fromMessages([
  [
    "system", 
    `You are an advanced AI coding assistant and problem solver. Your capabilities include:

    🔧 **Technical Expertise:**
    - Writing, debugging, and explaining code in multiple languages
    - Providing architectural guidance and best practices
    - Solving complex programming problems step-by-step
    - Code review and optimization suggestions

    🎯 **Communication Style:**
    - Direct, helpful, and conversational responses
    - Clear explanations with practical examples
    - Use code blocks with proper syntax highlighting
    - Break down complex concepts into digestible parts

    💡 **Additional Features:**
    - Remember our conversation context for better assistance
    - Provide alternative solutions when appropriate
    - Ask clarifying questions when needed
    - Offer relevant tips and best practices

    Always aim to be helpful, accurate, and educational in your responses.`
  ],
  new MessagesPlaceholder("history"),
  ["human", "{input}"]
]);

// Function to get or create memory for a conversation with better error handling
function getOrCreateMemory(conversationId) {
  if (!conversationMemories.has(conversationId)) {
    try {
      // Create summary model on-demand
      const summaryKey = providers.gemini.allKeys[0] || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const summaryModel = summaryKey ? new ChatGoogleGenerativeAI({
        model: SUMMARY_MODEL,
        temperature: 0.3,
        maxOutputTokens: 1024,
        apiKey: summaryKey,
      }) : null;
      
      const memory = new ConversationSummaryBufferMemory({
        llm: summaryModel,
        maxTokenLimit: 2000,
        returnMessages: true,
        memoryKey: "history",
      });
      
      // Initialize the chat memory if it doesn't exist
      if (!memory.chatMemory) {
        memory.chatMemory = { messages: [] };
      }
      
      conversationMemories.set(conversationId, memory);
    } catch (error) {
      console.error("Error creating memory:", error);
      // Create a fallback memory object
      const fallbackMemory = {
        chatMemory: { messages: [] },
        movingSummaryBuffer: null,
        loadMemoryVariables: async () => ({ history: [] }),
        saveContext: async () => {},
      };
      conversationMemories.set(conversationId, fallbackMemory);
    }
  }
  return conversationMemories.get(conversationId);
}

// Streaming POST endpoint
export async function POST(request) {
  try {
    const { message, conversationId = "default" } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get memory for this conversation
    const memory = getOrCreateMemory(conversationId);
    
    // Load conversation history with error handling
    let memoryVariables;
    try {
      memoryVariables = await memory.loadMemoryVariables({});
    } catch (error) {
      console.error("Error loading memory variables:", error);
      memoryVariables = { history: [] };
    }
    
    // Provider selection (Gemini -> Cohere -> HF) with retry-on-failure
    let attempt = 0;
    const buildOrder = () => {
      const order = [];
      // include gemini only if at least one key under limit
      const gKeys = providers.gemini.allKeys;
      const hasGeminiCapacity = gKeys.some((_, idx) => (providers.gemini.used[idx] || 0) < providers.gemini.limitPerKey);
      if (hasGeminiCapacity) order.push('gemini');
      if (providers.cohere.keys.length && Date.now() >= cohereCooldownUntil) order.push('cohere');
      if (providers.openrouter.keys.length && Date.now() >= openrouterCooldownUntil) order.push('openrouter');
      return order;
    };
    const providerOrder = buildOrder();
    const maxAttempts = providerOrder.length;
    console.log(`🔸 [Chat] Provider order: [${providerOrder.join(' → ')}] | Gemini usage: [${providers.gemini.allKeys.map((_, i) => providers.gemini.used[i] || 0).join(', ')}]`);

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // If nothing is available, send a soft fallback message and exit gracefully
        if (maxAttempts === 0) {
          const meta = JSON.stringify({ type: 'provider', provider: 'system', model: 'none' });
          controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
          const polite = "I'm temporarily unavailable due to provider limits. Please try again in a few minutes.";
          const data = JSON.stringify({ type: 'chunk', content: polite, conversationId, chunkIndex: 1 });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          const done = JSON.stringify({ type: 'complete', fullResponse: polite, conversationId, totalChunks: 1 });
          controller.enqueue(encoder.encode(`data: ${done}\n\n`));
          controller.close();
          return;
        }
        const tryOnce = async () => {
          const nameHint = providerOrder[attempt];
          if (!nameHint) throw new Error('No providers available');
          // if hint is gemini but capacity ended meanwhile, rebuild order and move on
          let providerName = nameHint;
          if (providerName === 'gemini') {
            const gKeys = providers.gemini.allKeys;
            const hasGeminiCapacity = gKeys.some((_, idx) => (providers.gemini.used[idx] || 0) < providers.gemini.limitPerKey);
            if (!hasGeminiCapacity) {
              attempt += 1; // skip gemini
              return tryOnce();
            }
          }

          // pick key for chosen provider
          let key, keyIndex;
          if (providerName === 'gemini') {
            const gKeys = providers.gemini.allKeys;
            for (let i = 0; i < gKeys.length; i++) {
              const kIdx = (providers.gemini.idx + i) % gKeys.length;
              const used = providers.gemini.used[kIdx] || 0;
              if (used < providers.gemini.limitPerKey) {
                providers.gemini.idx = kIdx;
                key = gKeys[kIdx];
                keyIndex = kIdx;
                break;
              }
            }
          } else if (providerName === 'cohere') {
            keyIndex = providers.cohere.idx % providers.cohere.keys.length;
            key = providers.cohere.keys[keyIndex];
            providers.cohere.idx = (keyIndex + 1) % providers.cohere.keys.length;
          } else {
            keyIndex = providers.openrouter.idx % providers.openrouter.keys.length;
            key = providers.openrouter.keys[keyIndex];
            providers.openrouter.idx = (keyIndex + 1) % providers.openrouter.keys.length;
          }
          if (!key) {
            attempt += 1;
            return tryOnce();
          }

          // record usage per user prompt
          recordUsage(providerName, keyIndex);
          console.log(`🔹 [Chat] Using provider: ${providerName.toUpperCase()} | Key index: ${keyIndex} | Usage: ${providers[providerName === 'gemini' ? 'gemini' : providerName === 'cohere' ? 'cohere' : 'openrouter'].used[keyIndex] || 1}/${providerName === 'gemini' ? providers.gemini.limitPerKey : 'unlimited'}`);

          let fullResponse = "";
          let chunkCount = 0;

          // Helper to emit chunk
          const sendChunk = (text) => {
            const data = JSON.stringify({
              type: "chunk",
              content: text,
              conversationId,
              chunkIndex: ++chunkCount,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

          try {
            if (providerName === 'gemini') {
              const modelName = DEFAULT_MODEL;
              const meta = JSON.stringify({ type: 'provider', provider: 'gemini', model: modelName });
              controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
              const model = new ChatGoogleGenerativeAI({
                model: DEFAULT_MODEL,
                temperature: 0.7,
                maxOutputTokens: 2048,
                apiKey: key,
              });

              const chain = RunnableSequence.from([
                chatPrompt,
                model,
                new StringOutputParser(),
              ]);

              const streamResponse = await chain.stream({
                input: message,
                history: memoryVariables.history || [],
              });

              for await (const chunk of streamResponse) {
                fullResponse += chunk;
                sendChunk(chunk);
              }
            } else if (providerName === 'cohere') {
              const cohereModel = process.env.COHERE_MODEL || 'command-r-08-2024';
              const meta = JSON.stringify({ type: 'provider', provider: 'cohere', model: cohereModel });
              controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
              // Cohere chat API v2 with fast-fail on rate limit
              const res = await fetch('https://api.cohere.com/v2/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${key}`,
                },
                body: JSON.stringify({
                  model: cohereModel,
                  messages: [{ role: 'user', content: message }],
                }),
              });
              if (!res.ok) {
                const errorText = await res.text();
                // Fast-fail on rate limit - don't wait, skip to next provider
                if (res.status === 429) {
                  console.warn('⚠️ Cohere rate limited (trial 10/min), switching to next provider');
                  // Set cooldown for 60 seconds to avoid repeated delays
                  cohereCooldownUntil = Date.now() + 60_000;
                  throw new Error('Cohere rate limited');
                }
                console.error(`❌ Cohere API error ${res.status}:`, errorText);
                throw new Error(`Cohere error ${res.status}: ${errorText.slice(0, 100)}`);
              }
              const data = await res.json();
              console.log('🔹 Cohere response:', data);
              const text = data?.message?.content?.[0]?.text || data.text || '';
              fullResponse = text || "";
              // stream out in chunks of ~500 chars
              for (let i = 0; i < fullResponse.length; i += 500) {
                sendChunk(fullResponse.slice(i, i + 500));
              }
            } else {
              // OpenRouter - hedged requests over multiple free models
              // Filter out models temporarily blacklisted due to 404
              const models = (process.env.OPENROUTER_MODELS || 'google/gemini-2.0-flash-exp:free')
                .split(',')
                .map(m => m.trim())
                .filter(m => {
                  const exp = openrouterNoEndpoint.get(m);
                  if (!exp) return true;
                  if (Date.now() > exp) { openrouterNoEndpoint.delete(m); return true; }
                  return false;
                });
              // Hedge across up to 3 models with 2s staggering
              const hedgeCount = Math.min(3, models.length);
              const controllers = [];

              const startModel = async (modelName) => {
                const ac = new AbortController();
                controllers.push(ac);
                // Per-model 8s timeout to avoid long queues on free tier
                const timeoutId = setTimeout(() => ac.abort(), 8000);
                try {
                  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${key}`,
                      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                      'X-Title': 'Xen.ai Chat',
                    },
                    body: JSON.stringify({
                      model: modelName,
                      messages: [
                        { role: 'system', content: 'You are a helpful coding assistant. Answer clearly in plain English sentences. Do not use emojis. Keep responses concise unless code is requested.' },
                        { role: 'user', content: message }
                      ],
                      max_tokens: 256,
                      temperature: 0.7,
                    }),
                    signal: ac.signal,
                  });
                  if (!res.ok) {
                    const errorText = await res.text();
                    // Daily free quota exceeded -> set cooldown (15 min) and propagate error
                    if (res.status === 429 && /free-models-per-day/i.test(errorText)) {
                      openrouterCooldownUntil = Date.now() + 15 * 60_000;
                    }
                    // No endpoints -> blacklist model for 10 minutes
                    if (res.status === 404) {
                      openrouterNoEndpoint.set(modelName, Date.now() + 10 * 60_000);
                    }
                    throw new Error(`OpenRouter ${modelName} ${res.status}: ${errorText.slice(0, 200)}`);
                  }
                  const data = await res.json();
                  let text = data?.choices?.[0]?.message?.content || '';
                  // Sanitize special tokens often returned by some models
                  text = text.replace(/<\/?s>/g, '').replace(/\u200b/g, '').trim();
                  // Basic quality check: reject empty, ultra-short, or emoji-only replies
                  const hasLetters = /[A-Za-z]/.test(text);
                  if (!text || text.trim().length < 8 || !hasLetters) {
                    throw new Error(`Low-quality reply from ${modelName}: '${text.slice(0, 20)}'`);
                  }
                  return { modelName, text };
                } finally {
                  clearTimeout(timeoutId);
                }
              };

              // Create staggered promises
              const hedges = [];
              for (let i = 0; i < hedgeCount; i++) {
                const modelName = models[i];
                const delayMs = i * 2000; // 0ms, 2000ms, 4000ms
                const p = new Promise((resolve, reject) => {
                  const start = () => startModel(modelName).then(resolve).catch(reject);
                  if (delayMs > 0) setTimeout(start, delayMs); else start();
                });
                hedges.push(p);
              }

              // If first wave fails entirely, fall back to sequential tries for remaining models
              let winner;
              try {
                winner = await Promise.any(hedges);
              } catch (aggregateErr) {
                // All hedged failed; try remaining models sequentially
                for (let j = hedgeCount; j < models.length; j++) {
                  try {
                    winner = await startModel(models[j]);
                    if (winner) break;
                  } catch (e) {
                    console.error(`❌ OpenRouter model ${models[j]} failed:`, e.message);
                  }
                }
                if (!winner) throw new Error('All OpenRouter models failed');
              }

              // Abort in-flight losers
              controllers.forEach(c => { try { c.abort(); } catch (_) {} });

              // Send provider meta for winner and stream text
              const meta = JSON.stringify({ type: 'provider', provider: 'openrouter', model: winner.modelName });
              controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
              console.log(`🔹 OpenRouter response (${winner.modelName})`);
              fullResponse = winner.text;
              for (let i = 0; i < fullResponse.length; i += 500) {
                sendChunk(fullResponse.slice(i, i + 500));
              }
            }

            // Save memory (best-effort). Use Gemini for summarization when available.
            try {
              const summaryKey = providers.gemini.allKeys[0] || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
              if (summaryKey) {
                const summaryModel = new ChatGoogleGenerativeAI({
                  model: SUMMARY_MODEL,
                  temperature: 0.3,
                  maxOutputTokens: 1024,
                  apiKey: summaryKey,
                });
                const memory = getOrCreateMemory(conversationId);
                await memory.saveContext(
                  { input: message },
                  { output: fullResponse }
                );
              }
            } catch (e) {
              console.warn('Memory save warning:', e?.message);
            }

            // completion
            const completionData = JSON.stringify({
              type: 'complete',
              fullResponse,
              conversationId,
              totalChunks: chunkCount,
            });
            controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
            controller.close();
          } catch (err) {
            console.error(`❌ Provider ${providerName} failed:`, err.message);
            attempt += 1;
            // If we still have providers to try, recurse; else error
            while (attempt < maxAttempts && !completed) {
              console.log(`🔄 Retrying with next provider (attempt ${attempt + 1}/${maxAttempts})`);
              await tryOnce();
              return;
            }
            // All providers exhausted: stream polite fallback and complete (no error events)
            console.error('❌ All providers exhausted');
            const meta = JSON.stringify({ type: 'provider', provider: 'system', model: 'none' });
            controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
            const polite = 'All AI providers are busy right now. Please try again in a few minutes.';
            const dataMsg = JSON.stringify({ type: 'chunk', content: polite, conversationId, chunkIndex: 1 });
            controller.enqueue(encoder.encode(`data: ${dataMsg}\n\n`));
            const doneMsg = JSON.stringify({ type: 'complete', fullResponse: polite, conversationId, totalChunks: 1 });
            controller.enqueue(encoder.encode(`data: ${doneMsg}\n\n`));
            controller.close();
            
          }
        };
await tryOnce();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response", details: error.message },
      { status: 500 }
    );
  }
}

// Non-streaming PUT endpoint (fallback)
export async function PUT(request) {
  try {
    const { message, conversationId = "default" } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get memory for this conversation
    const memory = getOrCreateMemory(conversationId);
    
    // Load conversation history with error handling
    let memoryVariables;
    try {
      memoryVariables = await memory.loadMemoryVariables({});
    } catch (error) {
      console.error("Error loading memory variables:", error);
      memoryVariables = { history: [] };
    }
    
    // Create the chain (without streaming)
    const nonStreamingModel = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0.7,
      maxOutputTokens: 2048,
      streaming: false,
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    });

    const chain = RunnableSequence.from([
      chatPrompt,
      nonStreamingModel,
      new StringOutputParser(),
    ]);

    // Get response
    const response = await chain.invoke({
      input: message,
      history: memoryVariables.history || [],
    });

    // Save the conversation to memory with error handling
    try {
      await memory.saveContext(
        { input: message },
        { output: response }
      );
    } catch (memoryError) {
      console.error("Error saving to memory:", memoryError);
      // Continue without saving to memory if there's an error
    }

    const memoryStats = {
      tokenCount: 0,
      hasSummary: false
    };

    try {
      const chatMemory = memory.chatMemory || {};
      const messages = chatMemory.messages || [];
      memoryStats.tokenCount = messages.length;
      memoryStats.hasSummary = !!memory.movingSummaryBuffer;
    } catch (error) {
      console.error("Error getting memory stats:", error);
    }

    return NextResponse.json({ 
      aiResponse: response, 
      conversationId,
      memoryStats
    }, { status: 200 });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for conversation summary and statistics
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId') || 'default';
    
    const memory = conversationMemories.get(conversationId);
    
    if (!memory) {
      return NextResponse.json({ 
        summary: "No conversation found for this workspace",
        messageCount: 0,
        recentMessages: [],
        conversationId
      });
    }

    const memoryVariables = await memory.loadMemoryVariables({});
    
    // Get conversation statistics with safe access
    const chatMemory = memory.chatMemory || {};
    const messages = chatMemory.messages || [];
    const messageCount = messages.length;
    const hasLongHistory = messageCount > 10;
    const recentMessages = memoryVariables.history?.slice(-4) || [];
    
    return NextResponse.json({
      conversationId,
      summary: memory.movingSummaryBuffer || "Conversation is still building context. No summary available yet.",
      messageCount,
      hasLongHistory,
      recentMessages: recentMessages.map(msg => {
        try {
          return {
            role: msg._getType ? msg._getType() : 'unknown',
            content: (msg.content || '').substring(0, 100) + ((msg.content || '').length > 100 ? '...' : ''),
            timestamp: new Date().toISOString()
          };
        } catch (err) {
          return {
            role: 'unknown',
            content: 'Error parsing message',
            timestamp: new Date().toISOString()
          };
        }
      }),
      memoryStats: {
        bufferSize: memory.movingSummaryBuffer?.length || 0,
        chatMemorySize: messageCount,
        isUsingCompression: !!memory.movingSummaryBuffer
      }
    });

  } catch (error) {
    console.error("Memory retrieval error:", error);
    const { searchParams } = new URL(request.url);
    return NextResponse.json(
      { 
        error: "Failed to retrieve conversation summary", 
        details: error.message,
        conversationId: searchParams.get('conversationId') || 'default'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear conversation memory
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId') || 'default';
    
    if (conversationMemories.has(conversationId)) {
      conversationMemories.delete(conversationId);
      return NextResponse.json({ 
        message: "Conversation memory cleared successfully",
        conversationId 
      });
    }
    
    return NextResponse.json({ 
      message: "No conversation found to clear",
      conversationId 
    });

  } catch (error) {
    console.error("Memory deletion error:", error);
    return NextResponse.json(
      { error: "Failed to clear conversation memory", details: error.message },
      { status: 500 }
    );
  }
}

// OPTIONS endpoint for CORS
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}