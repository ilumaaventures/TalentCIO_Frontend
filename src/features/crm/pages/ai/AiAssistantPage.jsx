import React, { useState } from 'react';
import { Bot, Sparkles, Send, ArrowRight, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { aiService } from '../../services/api';

export const AiAssistantPage = ({ onNavigate }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Sales Copilot. I analyze your live pipeline, lead qualification, deal risk indicators, and team activities in real-time. Ask me anything about your current sales data or click a suggested prompt below.',
      actionItems: ['Which deals are at risk?', 'Which leads need follow-up today?', 'Show my highest-value opportunities'],
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const suggestedPrompts = [
    'Which deals are at risk?',
    'Which leads need follow-up today?',
    'Show my highest-value opportunities.',
    'Which leads have not been contacted?',
    'Which salesperson is performing best?',
    'Draft a follow-up email.',
  ];

  const handleSend = async (queryText) => {
    const text = queryText || inputQuery;
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await aiService.askAssistant({ prompt: text });
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.answer,
            actionItems: res.data.actionItems,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to analyze query: ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">AI Sales Assistant</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Live Database Intelligence
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Ask questions against your MongoDB pipeline data to uncover risks, recommendations, and drafts.
        </p>
      </div>

      {/* Suggested Prompt Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Chat Interface */}
      <Card padding="none" className="h-[520px] flex flex-col overflow-hidden bg-slate-50/40">
        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs space-y-2 ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {isUser ? null : <Bot className="w-4 h-4 text-indigo-600" />}
                    <span>{isUser ? 'You' : 'AI Sales Assistant'}</span>
                  </div>

                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Action Items */}
                  {msg.actionItems && msg.actionItems.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Recommended Next Steps:</p>
                      {msg.actionItems.map((action, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-1.5 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 text-xs text-slate-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Analyzing pipeline data & computing insights...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about pipeline health, at-risk deals, top performers, or draft a message..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
          <Button size="sm" icon={Send} disabled={isLoading}>
            Ask AI
          </Button>
        </form>
      </Card>
    </div>
  );
};
