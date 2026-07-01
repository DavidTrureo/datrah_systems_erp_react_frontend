import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export function Copilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: '¡Hola! Soy Datrah Copilot, tu asistente financiero inteligente. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tus balances, stock o ventas.',
      timestamp: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking and context awareness
    setTimeout(async () => {
      let aiResponse = 'Entendido. Estoy analizando tus datos...';
      const lowercaseInput = userMessage.text.toLowerCase();

      try {
        if (lowercaseInput.includes('utilidad') || lowercaseInput.includes('ganancia') || lowercaseInput.includes('balance')) {
          const resultados = await api.getEstadoResultados();
          const utilidad = resultados.utilidadNeta;
          aiResponse = `Actualmente tu Utilidad Neta es de **$${utilidad.toLocaleString('es-CL')}**. ${utilidad >= 0 ? '¡Excelente trabajo, estás generando ganancias!' : 'Atención, el balance está en rojo.'}`;
        } else if (lowercaseInput.includes('ventas') || lowercaseInput.includes('vendido') || lowercaseInput.includes('factura')) {
          const facturas = await api.getFacturas();
          const totalVentas = facturas.reduce((acc, f) => acc + f.total, 0);
          aiResponse = `Se han registrado **${facturas.length}** facturas, sumando un total de ventas históricas de **$${totalVentas.toLocaleString('es-CL')}**.`;
        } else if (lowercaseInput.includes('inventario') || lowercaseInput.includes('stock')) {
          const productos = await api.getProductos();
          const numAlertas = productos.filter(p => Number(p.stockActual) <= Number(p.stockMinimo)).length;
          aiResponse = `Actualmente hay ${numAlertas} producto(s) con stock crítico. ¡Te recomiendo revisar el módulo de inventario pronto!`;
        } else {
          aiResponse = 'Interesante. Como soy un asistente IA en desarrollo, mis capacidades completas aún se están integrando, pero pronto podré cruzar toda la data de Datrah Systems para darte proyecciones exactas sobre esto.';
        }
      } catch (error) {
        console.error('Copilot fetch error:', error);
        aiResponse = 'Lo siento, tuve un problema al conectarme con la base de datos de Datrah Systems. Por favor, intenta de nuevo.';
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fixed bottom-24 right-24 z-50">
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-primary rounded-full shadow-xl flex-center-gap-8 relative group copilot-btn"
          title="Abrir Copilot"
        >
          <div className="absolute -top-2 -right-2 bg-danger rounded-full w-4 h-4 animate-ping"></div>
          <div className="absolute -top-2 -right-2 bg-danger rounded-full w-4 h-4 border-2 border-primary"></div>
          <Sparkles size={28} className="text-white group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Ventana de chat */}
      {isOpen && (
        <div className="bg-secondary rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 copilot-window">
          {/* Header */}
          <div className="p-16 flex items-center justify-between copilot-header">
            <div className="flex items-center gap-12">
              <div className="bg-primary p-8 rounded-lg">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h3 className="m-0 font-bold copilot-title">Datrah Copilot <span className="text-xs px-8 py-2 rounded-full bg-primary/20 text-primary font-bold ml-4 border border-primary/30">AI</span></h3>
                <p className="m-0 text-muted copilot-subtitle">Inteligencia Financiera</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-white transition-colors" title="Cerrar">
              <X size={20} />
            </button>
          </div>

          {/* Cuerpo del chat */}
          <div className="flex-1 overflow-y-auto p-16 copilot-body">
            <div className="flex flex-col gap-16">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-12 shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-secondary border border-white/5 rounded-tl-sm'}`}>
                    {msg.sender === 'ai' && (
                      <div className="flex items-center gap-8 mb-4">
                        <Sparkles size={14} className="text-primary" />
                        <span className="text-xs font-bold text-primary">Copilot</span>
                      </div>
                    )}
                    <p className="m-0 copilot-msg-text">
                      {/* Bold parsing for basic markdown support */}
                      {msg.text.split('**').map((chunk, i) => (
                        i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk
                      ))}
                    </p>
                    <div className={`text-right mt-4 text-[10px] ${msg.sender === 'user' ? 'text-white/70' : 'text-muted'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary border border-white/5 rounded-2xl rounded-tl-sm p-12 max-w-[85%]">
                    <div className="flex gap-4">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-0"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-16 bg-secondary copilot-footer">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Pregúntale a Datrah AI..."
                className="form-control w-full pr-48 copilot-input"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSend();
                }}
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-8 p-8 rounded-full bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                title="Enviar mensaje"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="text-center mt-8">
              <span className="text-[10px] text-muted flex items-center justify-center gap-4">
                <AlertCircle size={10} /> Copilot puede cometer errores. Verifica la info.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
