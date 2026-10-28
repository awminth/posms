import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RotateCcw,
  ChevronDown,
  Copy,
  Check,
  HelpCircle,
  ArrowRight,
  Layers,
  Store,
  DollarSign,
  FileSpreadsheet,
  UserCog,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ChatMessage,
  FIXED_GEMINI_API_KEY,
  sendChatMessage,
} from '../../services/geminiService';

const SUGGESTED_PROMPTS = [
  {
    icon: UserCog,
    titleMy: 'Login အကောင့်အသစ် ဖောက်နည်း',
    titleEn: 'Create user / login account',
    prompt: 'OmniPOS စနစ်ထဲမှာ login account အသစ်တစ်ခု ဘယ်လိုဖောက်ရမလဲ၊ ဘယ် menu နဲ့ ဘယ်ခလုတ်တွေကို နှိပ်ရမလဲ တိတိကျကျ ရှင်းပြပေးပါ။',
    tab: 'users' as const,
  },
  {
    icon: Store,
    titleMy: 'ကုန်ဝယ်ယူမှု (Purchase) သွင်းနည်း',
    titleEn: 'How to enter Purchases & Shipping',
    prompt: 'ကုန်ဝယ်ယူမှု (Purchase Voucher) သွင်းနည်းနဲ့ ကုန်ဝယ်သယ်ခ (Freight Cost / Landed Cost) တွက်ချက်ပုံကို အဆင့်ဆင့် ရှင်းပြပေးပါ။',
    tab: 'suppliers' as const,
  },
  {
    icon: Layers,
    titleMy: 'ပင်မစတိုမှ ဆိုင်ခွဲစတော့ခွဲနည်း',
    titleEn: 'Stock distribution to branches',
    prompt: 'ပင်မဂိုဒေါင် (Central Warehouse) ကနေ ဆိုင်ခွဲတွေထံ စတော့ခွဲဝေဖြန့်ဖြူးခြင်း (Stock Share) ပြုလုပ်ပုံကို ရှင်းပြပေးပါ။',
    tab: 'inventory' as const,
  },
  {
    icon: DollarSign,
    titleMy: 'ကောင်တာမှာ အကြွေးအရောင်းလုပ်နည်း',
    titleEn: 'Customer Credit POS Sales',
    prompt: 'ကောင်တာ အရောင်းစက် (POS) မှာ Customer Credit (အကြွေးအရောင်း) ပြုလုပ်နည်းနဲ့ အကြွေးပြန်ဆပ်နည်းကို ရှင်းပြပေးပါ။',
    tab: 'register' as const,
  },
  {
    icon: HelpCircle,
    titleMy: 'COGS နှင့် အရှုံးအမြတ် (P&L) တွက်ပုံ',
    titleEn: 'COGS & Profit/Loss formulas',
    prompt: 'COGS = (Opening + Purchase) - Closing ညီမျှခြင်းနဲ့ အသားတင်အမြတ် (Net Profit) ဘယ်လိုတွက်ချက်လဲ ရှင်းပြပေးပါ။',
    tab: 'financial' as const,
  },
  {
    icon: FileSpreadsheet,
    titleMy: 'Excel (.xlsx) အစီရင်ခံစာ ထုတ်နည်း',
    titleEn: 'Export Audited Excel report',
    prompt: 'Financial Report ကနေ Audited Excel (.xlsx) အစီရင်ခံစာ ဘယ်လို Download ထုတ်ယူရမလဲ ရှင်းပြပေးပါ။',
    tab: 'financial' as const,
  },
];

export const AIChatBot: React.FC = () => {
  const { setActiveTab } = usePOS();
  const { language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initial welcome message on mount
  useEffect(() => {
    const welcomeText =
      language === 'my'
        ? `မင်္ဂလာပါ! ကျွန်တော်က **OmniPOS (posMS) AI Guide** ဖြစ်ပါတယ်။ 
စနစ်အသုံးပြုပုံ၊ ကုန်ဝယ်ယူမှုသွင်းနည်း၊ ဆိုင်ခွဲစတော့ခွဲဝေနည်း၊ အရောင်းပြုလုပ်နည်းနှင့် ဘဏ္ဍာရေး အရှုံးအမြတ် (P&L) စစ်ဆေးနည်းများကို မည်သည့်အချိန်မဆို မေးမြန်းနိုင်ပါသည်ခင်ဗျာ။`
        : `Hello! I am your **OmniPOS (posMS) AI Assistant**.
Ask me anything about using the system, purchase vouchers, stock distribution, POS checkout, or financial P&L reporting!`;

    setMessages([
      {
        role: 'model',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [language]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Support external trigger (e.g. from TopHeader or shortcuts)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('omnipos:open-ai-chat', handleOpen);
    return () => window.removeEventListener('omnipos:open-ai-chat', handleOpen);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const newMsg: ChatMessage = {
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Pass previous chat turns (excluding the initial welcome greeting if it's the only one)
      const apiHistory = updatedMessages.slice(1, -1);
      const replyText = await sendChatMessage(apiHistory, query, FIXED_GEMINI_API_KEY);

      const botReply: ChatMessage = {
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('[AIChatBot] Error:', err);
      let errStr = 'မေးခွန်းကို ဖြေဆိုရာတွင် အဆင်မပြေဖြစ်သွားပါသည်။ ထပ်မံကြိုးစားပေးပါ။';
      if (err.message && err.message !== 'INVALID_API_KEY') {
        errStr = `Error: ${err.message}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **အမှားအယွင်း ဖြစ်ပေါ်ပါသည်:** ${errStr}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: 'model',
        text:
          language === 'my'
            ? 'စကားပြောမှတ်တမ်းကို ရှင်းလင်းပြီးပါပြီ။ posMS စနစ်နှင့်ပတ်သက်ပြီး သိလိုသည်များကို မေးမြန်းနိုင်ပါသည်ခင်ဗျာ။'
            : 'Chat history cleared. Feel free to ask any question about posMS!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Simple Markdown-style formatter for chat text
  const renderFormattedText = (text: string) => {
    // Split into paragraphs / lines
    const lines = text.split('\n');

    return (
      <div className="space-y-1.5 text-xs leading-relaxed break-words">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Process bold **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);

          return (
            <p key={idx} className={line.startsWith('- ') || line.startsWith('* ') ? 'pl-2' : ''}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-bold text-slate-900">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={pIdx}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right) */}
      {!isOpen && (
        <button
          id="omnipos-ai-bubble-btn"
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-18 lg:bottom-6 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-teal-600 to-sky-600 text-white shadow-xl shadow-teal-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
          title="posMS AI Guide"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-extrabold flex items-center gap-1">
              <span>AI Guide</span>
              <Sparkles className="w-3 h-3 text-amber-300" />
            </div>
            <div className="text-[10px] text-teal-100 font-medium">စနစ်အသုံးပြုနည်း မေးမြန်းရန်</div>
          </div>
        </button>
      )}

      {/* Chat Window Dialog */}
      {isOpen && (
        <div className="fixed bottom-0 sm:bottom-6 right-0 sm:right-5 z-50 w-full sm:w-[420px] max-w-full h-[90vh] sm:h-[620px] max-h-screen bg-white sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-teal-700 via-teal-600 to-sky-600 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold flex items-center gap-1.5 leading-snug">
                  <span>OmniPOS AI Guide</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-teal-100">
                    Gemini
                  </span>
                </h3>
                <p className="text-[11px] text-teal-100">စနစ်အသုံးပြုပုံ အကူအညီ</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear History */}
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="စကားပြောမှတ်တမ်း ရှင်းလင်းရန်"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="ပိတ်မည်"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-600 to-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] rounded-2xl p-3 shadow-xs ${
                      isUser
                        ? 'bg-teal-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {renderFormattedText(msg.text)}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                          <span>{msg.timestamp}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.text, idx)}
                            className="p-1 hover:text-slate-700 rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
                            title="စာသား ကူးယူမည်"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Loader Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500">
                <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-white rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-slate-400 font-medium pl-1">
                    Gemini ဖြေဆိုနေပါသည်...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preset Suggestion Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {SUGGESTED_PROMPTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    handleSendMessage(item.prompt);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-[11px] font-semibold whitespace-nowrap border border-slate-200/80 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Icon className="w-3.5 h-3.5 text-teal-600" />
                  <span>{language === 'my' ? item.titleMy : item.titleEn}</span>
                </button>
              );
            })}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  language === 'my'
                    ? 'posMS အသုံးပြုပုံ မေးမြန်းပါ...'
                    : 'Ask anything about posMS...'
                }
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-200 transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer shadow-sm shadow-teal-600/30 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
