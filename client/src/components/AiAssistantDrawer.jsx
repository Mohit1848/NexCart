import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  Check,
  AlertCircle,
  Bot,
  User,
  ArrowRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { sendAiChatApi, formatCurrency } from '../api/client';

const QUICK_PROMPTS = [
  '🎧 Headphones under ₹4,000',
  '⌨️ Mechanical keyboards',
  '⌚ Smartwatches in stock',
  '🔥 Best budget tech deals',
  '🖥️ Studio monitors for work'
];

export const AiAssistantDrawer = () => {
  const { isAiOpen, setIsAiOpen, addItem } = useCart();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 **Welcome to NexCart AI!**\n\nI am your live catalog shopping assistant. Ask me anything about our tech products, compare items, check live stock availability, or find recommendations under your budget!",
      products: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState({});
  const [errorNotice, setErrorNotice] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isAiOpen, messages, loading]);

  // Handle Adding Product Directly to Cart from Recommendation Card
  const handleAddToCart = async (product) => {
    if (product.stockQuantity <= 0) return;
    try {
      setAddingId(product.id);
      await addItem(product.id, 1);
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 2500);
    } catch (err) {
      console.error('Failed to add recommended product to cart:', err);
    } finally {
      setAddingId(null);
    }
  };

  // Submit User Message
  const handleSendMessage = async (queryText) => {
    const text = (queryText || inputValue).trim();
    if (!text || loading) return;

    setErrorNotice(null);
    setInputValue('');

    const userMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Prepare history payload for API (last 6 turns, omitting welcome and products)
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content
      }));

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const data = await sendAiChatApi({
        message: text,
        history: historyPayload
      });

      const assistantMessage = {
        id: 'ast_' + Date.now(),
        role: 'assistant',
        content: data.reply || 'Here are my recommendations from the catalog:',
        products: Array.isArray(data.products) ? data.products : [],
        isAiGrounded: data.isAiGrounded,
        source: data.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI assistant chat request failed:', err);
      const errorMsg =
        err.response?.data?.error?.message ||
        'Unable to reach AI Shopping Assistant. Please check your connection and try again.';
      setErrorNotice(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Reset conversation
  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "✨ **Chat reset.** What tech gadgets or accessories can I help you find in our catalog?",
        products: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorNotice(null);
  };

  // Render basic markdown formatting (bold, bullet lines) safely
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div className="space-y-1.5 text-sm leading-relaxed text-slate-800">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Bullet points
          const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
          const lineContent = isBullet ? line.trim().substring(2) : line;

          // Parse **bold** parts
          const parts = lineContent.split(/(\*\*.*?\*\*)/g);
          const parsedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-950">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>{parsedLine}</span>
              </div>
            );
          }

          return <p key={idx}>{parsedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isAiOpen && (
        <button
          onClick={() => setIsAiOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-hidden focus:ring-4 focus:ring-indigo-300"
          aria-label="Open AI Shopping Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide">Ask AI</span>
          <span className="hidden sm:inline text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
            Catalog Grounded
          </span>
        </button>
      )}

      {/* Floating / Slide-over Chat Window */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsAiOpen(false)}
            className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Drawer Container */}
          <aside className="relative w-full max-w-lg md:max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 z-10 animate-slide-left">
            {/* Header */}
            <div className="p-4 px-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-base tracking-tight text-white">
                      NexCart AI Assistant
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                      Live Catalog
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Grounded in real-time pricing & inventory
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={handleClearHistory}
                  title="Clear conversation"
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsAiOpen(false)}
                  title="Close Assistant"
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto scrollbar-none flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Quick:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => handleSendMessage(prompt.replace(/^[^\s]+\s/, ''))}
                  className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors shadow-2xs disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`flex items-start space-x-2.5 max-w-[90%] sm:max-w-[85%] ${
                      msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl shadow-2xs ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200/90 rounded-tl-none text-slate-900 shadow-xs'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        renderFormattedText(msg.content)
                      )}

                      <span
                        className={`block text-[10px] mt-1.5 ${
                          msg.role === 'user' ? 'text-blue-100 text-right' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Grounded Recommended Products Cards */}
                  {msg.role === 'assistant' && msg.products && msg.products.length > 0 && (
                    <div className="w-full mt-3 pl-10 pr-2 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Recommended Products ({msg.products.length})</span>
                        <span className="text-emerald-600 font-medium lowercase">✓ Live Catalog Grounded</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.products.map((product) => {
                          const isOutOfStock = product.stockQuantity <= 0;
                          const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
                          const isAdded = !!addedIds[product.id];
                          const isAdding = addingId === product.id;

                          return (
                            <div
                              key={product.id}
                              className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
                            >
                              <div className="flex space-x-3">
                                {/* Thumbnail */}
                                <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80';
                                      }}
                                    />
                                  ) : (
                                    <ShoppingBag className="w-6 h-6 text-slate-300" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                                    {product.categoryName}
                                  </span>
                                  <Link
                                    to={`/products/${product.slug}`}
                                    onClick={() => setIsAiOpen(false)}
                                    className="block font-semibold text-xs text-slate-900 hover:text-blue-600 line-clamp-1 mt-0.5"
                                  >
                                    {product.name}
                                  </Link>
                                  <div className="mt-1 font-bold text-sm text-navy-900">
                                    {formatCurrency(product.price)}
                                  </div>
                                </div>
                              </div>

                              {/* Stock status & Add to cart button */}
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                {isOutOfStock ? (
                                  <span className="text-[11px] font-medium text-rose-600">
                                    Out of Stock
                                  </span>
                                ) : isLowStock ? (
                                  <span className="text-[11px] font-medium text-amber-600">
                                    Only {product.stockQuantity} left
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium text-emerald-600">
                                    In Stock ({product.stockQuantity})
                                  </span>
                                )}

                                <div className="flex items-center space-x-1.5">
                                  <Link
                                    to={`/products/${product.slug}`}
                                    onClick={() => setIsAiOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50 transition-colors"
                                    title="View Product Page"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => handleAddToCart(product)}
                                    disabled={isOutOfStock || isAdding}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                                      isAdded
                                        ? 'bg-emerald-600 text-white'
                                        : isOutOfStock
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                                    }`}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Added</span>
                                      </>
                                    ) : isAdding ? (
                                      <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                      <>
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        <span>Add</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-start space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-700">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3.5 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-xs text-sm text-slate-600 flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      Analyzing catalog & verifying inventory...
                    </span>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorNotice && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="flex-1">{errorNotice}</span>
                  <button
                    onClick={() => setErrorNotice(null)}
                    className="text-rose-500 hover:text-rose-800 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3.5 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about products, prices, stock..."
                    maxLength={1000}
                    disabled={loading}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all disabled:opacity-60"
                  />
                  {inputValue.length > 800 && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">
                      {1000 - inputValue.length}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20"
                  title="Send query"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Prices in INR (₹) • Live PostgreSQL Grounding</span>
                <span>Powered by OpenAI</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default AiAssistantDrawer;

