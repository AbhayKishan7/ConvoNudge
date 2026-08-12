'use client';

import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import { MessageSquare, Send, Sparkles, User, AlertCircle, Award, CheckCircle2, LogOut } from 'lucide-react';

export default function Home() {
  const [pseudonym, setPseudonym] = useState('');
  const [level, setLevel] = useState('beginner');
  const [isQueued, setIsQueued] = useState(false);
  const [myUserId, setMyUserId] = useState<string>('');
  
  const [sessionData, setSessionData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [aiHint, setAiHint] = useState<any>(null);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);
  const [partnerLeft, setPartnerLeft] = useState(false);

  const [feedback, setFeedback] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiHint, partnerLeft]);

  useEffect(() => {
    socket.on('match_found', (data) => {
      setIsQueued(false);
      setSessionData(data);
      setMyUserId(data.myUserId);
      setMessages([]);
      setPartnerLeft(false);
    });

    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('ai_copilot_hint', (hint) => {
      setAiHint(hint);
    });

    socket.on('message_blocked', (data) => {
      setBlockedNotice(data.reason);
      setTimeout(() => setBlockedNotice(null), 4000);
    });

    socket.on('partner_disconnected', () => {
      setPartnerLeft(true);
    });

    return () => {
      socket.off('match_found');
      socket.off('receive_message');
      socket.off('ai_copilot_hint');
      socket.off('message_blocked');
      socket.off('partner_disconnected');
    };
  }, []);

  const handleJoinQueue = () => {
    if (!pseudonym.trim()) return;
    socket.connect();
    const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
    
    socket.emit('join_queue', {
      userId,
      pseudonym,
      communicationLevel: level
    });

    setIsQueued(true);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !sessionData || partnerLeft) return;

    socket.emit('send_message', {
      sessionId: sessionData.sessionId,
      senderId: myUserId,
      content: inputMessage
    });

    setInputMessage('');
  };

  const handleEndSession = async () => {
    if (!sessionData) return;

    // Notify partner immediately over socket
    socket.emit('end_chat_session', { sessionId: sessionData.sessionId });

    try {
      const res = await fetch('http://localhost:5000/api/sessions/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          userId: myUserId
        })
      });
      const data = await res.json();
      if (data.feedback) {
        setFeedback(data.feedback.analytics);
      }
    } catch (err) {
      console.error('Error getting feedback:', err);
    } finally {
      setSessionData(null);
      setPartnerLeft(false);
      socket.disconnect();
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      
      {/* 1. LOBBY SCREEN */}
      {!sessionData && !feedback && (
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-600/20 text-emerald-400 rounded-full mb-2">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">ConvoNudge</h1>
            <p className="text-slate-400 text-sm">Practice anonymous 1-on-1 conversations with AI assistance.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Choose a Pseudonym</label>
              <input
                type="text"
                placeholder="e.g. QuietExplorer"
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Communication Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-100"
              >
                <option value="beginner">Beginner (Gentle practice)</option>
                <option value="intermediate">Intermediate (Improving conversation flow)</option>
                <option value="advanced">Advanced (Deep discussions)</option>
              </select>
            </div>

            <button
              onClick={handleJoinQueue}
              disabled={isQueued || !pseudonym}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 font-semibold rounded-lg transition text-white flex items-center justify-center gap-2"
            >
              {isQueued ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Searching for a peer...
                </>
              ) : (
                'Start Anonymous Practice'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. WHATSAPP STYLE CHAT ROOM */}
      {sessionData && !feedback && (
        <div className="max-w-xl w-full bg-[#0b141a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[650px] overflow-hidden">
          
          {/* Header */}
          <div className="p-3.5 bg-[#202c33] flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600/30 text-emerald-400 rounded-full flex items-center justify-center font-bold">
                {sessionData.partnerPseudonym.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-sm text-slate-100">{sessionData.partnerPseudonym}</h2>
                <p className="text-[11px] text-emerald-400 font-medium">
                  {partnerLeft ? 'Left the chat' : 'online'}
                </p>
              </div>
            </div>
            <button
              onClick={handleEndSession}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/20 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              End Chat
            </button>
          </div>

          {/* Guardrail Banner */}
          {blockedNotice && (
            <div className="p-2.5 bg-rose-500/20 text-rose-300 text-xs flex items-center gap-2 justify-center border-b border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{blockedNotice}</span>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0b141a]">
            {messages.length === 0 && (
              <div className="text-center my-6">
                <span className="bg-[#111b21] text-amber-300/80 text-[11px] px-3 py-1.5 rounded-lg border border-amber-500/10">
                  🔒 Messages are end-to-end moderated by AI. Start with a greeting!
                </span>
              </div>
            )}

            {messages.map((m, idx) => {
              const isMe = m.senderId === myUserId;
              const formattedTime = new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[78%] px-3.5 py-2 rounded-xl text-sm relative shadow ${
                      isMe 
                        ? 'bg-[#005c4b] text-slate-100 rounded-tr-none' 
                        : 'bg-[#202c33] text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="leading-relaxed break-words">{m.content}</p>
                    <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-emerald-200/60' : 'text-slate-400'}`}>
                      {formattedTime}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Partner Disconnected Alert */}
            {partnerLeft && (
              <div className="text-center my-4">
                <span className="bg-rose-950/80 text-rose-300 text-xs px-3.5 py-1.5 rounded-lg border border-rose-800/40 inline-flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Your partner has ended the session. Click "End Chat" to view your AI feedback report.
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* AI Co-Pilot Hint Banner */}
          {aiHint && !partnerLeft && (
            <div className="mx-3 mb-2 p-2.5 bg-[#182229] border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-emerald-400 block">AI Co-Pilot Suggestion:</span>
                <p className="text-slate-300 italic">"{aiHint.suggestedQuestion}"</p>
              </div>
            </div>
          )}

          {/* WhatsApp Style Input Bar */}
          <div className="p-3 bg-[#202c33] flex items-center gap-2">
            <input
              type="text"
              placeholder={partnerLeft ? "Session ended by partner" : "Type a message..."}
              disabled={partnerLeft}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 px-4 py-2.5 bg-[#2a3942] border-none rounded-xl focus:outline-none text-slate-100 text-sm placeholder-slate-400 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={partnerLeft || !inputMessage.trim()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. POST-SESSION AI FEEDBACK REPORT */}
      {feedback && (
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Session Analytics & Feedback</h2>
              <p className="text-xs text-slate-400">Evaluated by Groq Llama-3.3-70B</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">Question Quality</span>
              <span className="text-2xl font-bold text-emerald-400">{feedback.questionQualityScore}/10</span>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">Conversation Balance</span>
              <span className="text-2xl font-bold text-teal-400">{feedback.conversationBalanceScore}/10</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-slate-400">Key Strengths</h3>
            {feedback.strengths?.map((str: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{str}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-slate-400">Areas to Improve</h3>
            {feedback.areasForImprovement?.map((area: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{area}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setFeedback(null);
              setSessionData(null);
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition"
          >
            Return to Lobby
          </button>
        </div>
      )}
    </main>
  );
}
