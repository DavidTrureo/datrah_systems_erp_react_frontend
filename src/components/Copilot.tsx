import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, AlertCircle } from 'lucide-react';
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
  const copilotRef = useRef<HTMLDivElement>(null);

  // Drag and drop state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const initialMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (copilotRef.current && window.innerWidth >= 768) {
      copilotRef.current.style.transform = `translate(${position.x}px, ${position.y}px)`;
    } else if (copilotRef.current) {
      copilotRef.current.style.transform = 'none';
    }
  }, [position, isOpen]);
  const initialPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only allow dragging on desktop screens
    if (window.innerWidth < 768) return;
    if (!(e.target as HTMLElement).closest('.copilot-header')) return;
    setIsDragging(true);
    initialMouse.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || window.innerWidth < 768) return;
    const dx = e.clientX - initialMouse.current.x;
    const dy = e.clientY - initialMouse.current.y;
    setPosition({
      x: initialPos.current.x + dx,
      y: initialPos.current.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

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
    <>
      {/* Botón flotante para abrir Copilot */}
      {!isOpen && (
        <div 
          className="fixed z-40 transition-all"
          style={{
            bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(16px + env(safe-area-inset-right, 0px))'
          }}
        >
          <button
            onClick={() => {
              setPosition({ x: 0, y: 0 });
              setIsOpen(true);
            }}
            className="copilot-btn flex-center-gap-8 relative group cursor-pointer"
            title="Abrir Copilot"
            aria-label="Abrir Asistente Copilot"
          >
            <div className="absolute top-0 right-0 bg-danger rounded-full w-3 h-3 animate-ping"></div>
            <div className="absolute top-0 right-0 bg-danger rounded-full w-3 h-3 border-2 border-primary"></div>
            <Sparkles size={24} className="text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {/* Ventana de chat / Bottom Sheet en móviles */}
      {isOpen && (
        <div 
          className="copilot-modal-wrapper"
          onClick={(e) => {
            if (e.target === e.currentTarget && window.innerWidth < 768) {
              setIsOpen(false);
            }
          }}
        >
          <div 
            ref={copilotRef}
            className="copilot-window shadow-2xl flex flex-col"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Tirador táctil en móviles */}
            <div 
              className="copilot-mobile-handle block md:hidden cursor-pointer"
              onClick={() => setIsOpen(false)}
              role="button"
              tabIndex={0}
              aria-label="Cerrar Copilot"
            >
              <div className="copilot-drag-pill" />
            </div>

            {/* Header */}
            <div className="p-16 flex items-center justify-between copilot-header select-none">
              <div className="flex items-center gap-12">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#4f46e5] flex items-center justify-center shadow-lg shadow-primary/30">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="m-0 text-white font-semibold text-[16px] tracking-wide flex items-center gap-8">
                    Copilot
                    <span className="text-[10px] uppercase tracking-wider px-6 py-2 rounded-full bg-white/10 text-white/80 border border-white/20">Beta</span>
                  </h3>
                  <p className="m-0 text-muted text-[12px] mt-2">Inteligencia Financiera</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="bg-transparent border-none p-8 hover:bg-white/10 rounded-full text-muted hover:text-white transition-colors flex items-center justify-center cursor-pointer" 
                title="Cerrar"
                aria-label="Cerrar Copilot"
              >
                <X size={20} />
              </button>
            </div>

          {/* Cuerpo del chat */}
          <div className="flex-1 overflow-y-auto p-16 copilot-body">
            <div className="flex flex-col gap-16">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-12 shadow-sm backdrop-blur-md ${msg.sender === 'user' ? 'bg-gradient-to-r from-primary to-[#4f46e5] text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-sm'}`}>
                    {msg.sender === 'ai' && (
                      <div className="flex items-center gap-6 mb-8">
                        <Sparkles size={12} className="text-primary" />
                        <span className="text-[11px] font-medium text-primary uppercase tracking-wider">Copilot</span>
                      </div>
                    )}
                    <p className="m-0 copilot-msg-text">
                      {/* Bold parsing for basic markdown support */}
                      {msg.text.split('**').map((chunk, i) => (
                        i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk
                      ))}
                    </p>
                    <div className={`text-right mt-4 text-[10px] ${msg.sender === 'user' ? 'text-white/70' : 'text-white/40'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 text-white/90 rounded-2xl rounded-tl-sm p-12 max-w-[85%] shadow-sm backdrop-blur-md">
                    <div className="flex gap-4">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
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
          <div className="p-16 copilot-footer">
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full px-4 focus-within:border-primary/50 focus-within:bg-white/10 transition-all shadow-inner">
              <input
                type="text"
                placeholder="Pregúntale a Copilot..."
                className="bg-transparent border-none text-white text-[14px] w-full copilot-input outline-none placeholder:text-muted"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSend();
                }}
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-6 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-30 disabled:bg-white/10 transition-all border-none"
                title="Enviar mensaje"
              >
                <Send size={14} className={inputValue.trim() ? "ml-[-2px]" : ""} />
              </button>
            </div>
            <div className="text-center mt-12">
              <span className="text-[10px] text-white/40 flex items-center justify-center gap-4">
                <AlertCircle size={10} /> Copilot puede cometer errores. Verifica la info.
              </span>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
