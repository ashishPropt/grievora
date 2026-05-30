'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { grievanceApi } from '@/lib/api';
import { Send, ShieldAlert, CheckCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function NewGrievancePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [grievanceId, setGrievanceId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async () => {
    setLoading(true);
    try {
      const res = await grievanceApi.start();
      setSessionId(res.data.session_id);
      setMessages([{ role: 'assistant', content: res.data.message }]);
    } catch {
      toast.error('Failed to start session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await grievanceApi.sendMessage(sessionId, userMsg);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
      if (res.data.completed) setCompleted(true);
    } catch {
      toast.error('Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const submitGrievance = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await grievanceApi.complete(sessionId);
      setGrievanceId(res.data.grievance_id);
      setSubmitted(true);
      toast.success('Grievance submitted for review!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-3">Grievance Submitted</h1>
        <p className="text-slate-500 mb-6">Your grievance has been submitted and is under review by our moderation team. You&apos;ll earn a point once it&apos;s approved.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/providers')} className="bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Browse Providers
          </button>
          <button onClick={() => router.push('/')} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="w-6 h-6 text-red-600" />
        <h1 className="text-xl font-bold">Report a Grievance</h1>
      </div>

      {/* Chat window */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="chat-bubble-bot">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce delay-0">·</span>
                  <span className="animate-bounce delay-75">·</span>
                  <span className="animate-bounce delay-150">·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {!completed ? (
          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your response..."
                rows={2}
                className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={loading || !sessionId}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading || !sessionId}
                className="bg-red-600 text-white px-4 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
          </div>
        ) : (
          <div className="border-t border-slate-200 p-4 text-center">
            <p className="text-sm text-green-700 mb-3 font-medium">Your grievance is ready to submit.</p>
            <button
              onClick={submitGrievance}
              disabled={loading}
              className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Grievance'}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Your grievance will be reviewed by our moderation team before being published.
      </p>
    </div>
  );
}
