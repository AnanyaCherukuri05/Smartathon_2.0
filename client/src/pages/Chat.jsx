import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Send, Trash2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import SectionHeader from '../components/SectionHeader';
import { apiFetch } from '../lib/apiClient';

const MAX_INPUT_CHARS = 1000;

const Chat = () => {
    const { t } = useTranslation();

    const welcomeMessage = useMemo(
        () => t('ai_chat_welcome') || 'Ask me anything about farming — crops, pests, weather, and markets.',
        [t],
    );

    const [messages, setMessages] = useState(() => ([
        { role: 'assistant', content: welcomeMessage },
    ]));
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    const clearChat = () => {
        setError('');
        setInput('');
        setMessages([{ role: 'assistant', content: welcomeMessage }]);
    };

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || sending) return;

        setError('');
        setSending(true);

        const nextMessages = [...messages, { role: 'user', content: trimmed }];
        setMessages(nextMessages);
        setInput('');

        try {
            const data = await apiFetch('/api/chat', {
                method: 'POST',
                body: { messages: nextMessages },
            });

            const reply = typeof data?.reply === 'string' ? data.reply : '';

            setMessages((prev) => ([
                ...prev,
                {
                    role: 'assistant',
                    content: reply || (t('ai_chat_empty_reply') || 'I could not generate a reply. Please try again.'),
                },
            ]));
        } catch (err) {
            const message = err?.message || (t('ai_chat_error') || 'Failed to send message.');
            setError(message);
            setMessages((prev) => ([
                ...prev,
                {
                    role: 'assistant',
                    content: t('ai_chat_error_reply') || 'I hit an error. Please try again in a moment.',
                },
            ]));
        } finally {
            setSending(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="space-y-5">
            <SectionHeader
                title={t('ai_chat') || 'AI Chat'}
                subtitle={t('ai_chat_subtitle') || 'Get quick, practical farming advice.'}
            />

            <GlassCard className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
                        <Bot className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{t('ai_chat_assistant') || 'KisanSetu Assistant'}</p>
                        <p className="text-xs font-medium text-gray-600">{sending ? (t('ai_chat_thinking') || 'Thinking…') : (t('ai_chat_ready') || 'Ready')}</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={clearChat}
                    className="flex items-center gap-2 rounded-xl border border-green-100 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-green-50"
                >
                    <Trash2 className="h-4 w-4 text-green-600" />
                    {t('ai_chat_clear') || 'Clear'}
                </button>
            </GlassCard>

            <GlassCard className="max-h-[52vh] overflow-y-auto p-4">
                <div className="space-y-3">
                    {messages.map((m, idx) => {
                        const isUser = m.role === 'user';
                        return (
                            <div
                                key={`${m.role}-${idx}`}
                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={
                                        `max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ` +
                                        (isUser
                                            ? 'bg-green-600 text-white'
                                            : 'border border-green-100 bg-white text-gray-800')
                                    }
                                >
                                    {m.content}
                                </div>
                            </div>
                        );
                    })}

                    {error ? (
                        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            {error}
                        </p>
                    ) : null}

                    <div ref={endRef} />
                </div>
            </GlassCard>

            <GlassCard className="p-4">
                <div className="flex items-end gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_CHARS))}
                        onKeyDown={onKeyDown}
                        rows={2}
                        placeholder={t('ai_chat_placeholder') || 'Type your question…'}
                        className="min-h-[44px] flex-1 resize-none rounded-xl border border-green-100 bg-white px-4 py-3 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-200"
                    />

                    <button
                        type="button"
                        onClick={sendMessage}
                        disabled={sending || !input.trim()}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white shadow-md transition-colors duration-200 hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t('ai_chat_send') || 'Send'}
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>

                <p className="mt-2 text-xs font-medium text-gray-600">
                    {t('ai_chat_hint') || 'Press Enter to send. Shift+Enter for a new line.'}
                </p>
            </GlassCard>
        </div>
    );
};

export default Chat;
