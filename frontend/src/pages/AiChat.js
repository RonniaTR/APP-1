import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { useLang } from '../contexts/LangContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Sen "Prof. Kültür" adında bir Kültür Koruma Akademisi yapay zeka asistanısın.

## Uzmanlık Alanların
- Türk kültür mirası ve tarihi eserler
- UNESCO Dünya Mirası alanları (özellikle Türkiye'dekiler)
- Arkeoloji ve restorasyon teknikleri
- Osmanlı ve Selçuklu mimarisi
- Anadolu medeniyetleri (Hitit, Frigya, Lidya, vb.)
- Müze yönetimi ve koruma ilkeleri
- Tarihi yapı restorasyonu (Paraloid B-72, B-48N vb. konsolidasyon malzemeleri)
- Kültürel miras hukuku (KTVKK 2863)

## Yanıt Kuralları
1. Her zaman Türkçe yanıt ver
2. Kısa, net ve bilgilendirici ol (maksimum 3-4 paragraf)
3. Somut örnekler ve Türkiye'den vakalar kullan
4. Uydurma bilgi verme; emin olmadığında "Bu konuyu kaynaklardan teyit etmenizi öneririm" de
5. Emoji kullanımı: Az ama etkili (💡🏛️📜⚗️🔍)

## Karakter
- İsmin: Prof. Kültür
- Sıcak, meraklı, öğretmeyi seven bir akademisyen`;

let geminiClient = null;
let geminiModel = null;

function getGeminiModel() {
  if (!geminiModel) {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) return null;
    geminiClient = new GoogleGenerativeAI(apiKey);
    geminiModel = geminiClient.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });
  }
  return geminiModel;
}

export default function AiChat() {
  const { t } = useLang();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat session
  useEffect(() => {
    const model = getGeminiModel();
    if (model) {
      const chatSession = model.startChat({ history: [] });
      setChat(chatSession);
    }
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      if (!chat) {
        throw new Error('Gemini API anahtarı yapılandırılmamış.');
      }
      const result = await chat.sendMessage(msg);
      const text = result.response.text();
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (err) {
      console.error('Gemini error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Hata: ${err.message || 'Bilinmeyen bir hata oluştu.'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const model = getGeminiModel();
    if (model) {
      setChat(model.startChat({ history: [] }));
    }
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" data-testid="ai-chat">
      <div className="bg-gradient-to-b from-blue-900/30 to-transparent px-5 pt-12 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{t.advisor || 'Al Hoca Asistan'}</h1>
            <p className="text-xs text-gray-400">{t.advisor_desc || 'Kültür koruma uzmanı'}</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10"
              data-testid="clear-chat-btn"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="text-4xl">🏛️</div>
            <p className="text-white font-medium">Merhaba! Ben Kültür Koruma Akademisi'nin AI hoca asistanıyım.</p>
            <p className="text-gray-400 text-sm">Arkeoloji, restorasyon teknikleri veya Türk kültür mirası hakkında sorularınızı yanıtlayabilirim.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['Paraloid B-72 nedir?', 'UNESCO Türkiye alanları', 'Hitit medeniyeti'].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-300 hover:bg-white/10 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`chat-message-${i}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-white/5 text-gray-200 rounded-bl-md border border-white/5'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
              <Loader2 size={18} className="animate-spin text-emerald-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="px-4 pb-4 pt-2 shrink-0">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t.ask_question || 'Bir soru sor...'}
            data-testid="chat-input"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            data-testid="chat-send-btn"
            className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
