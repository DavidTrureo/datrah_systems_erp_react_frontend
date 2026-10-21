import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  sublabel?: string;
}

interface CustomSelectProps {
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  searchable?: boolean;
  openDirection?: 'auto' | 'down' | 'up';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Seleccione una opción...',
  disabled = false,
  className = '',
  required = false,
  searchable,
  openDirection = 'auto'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const stringVal = value !== undefined && value !== null ? String(value) : '';
  const selectedOption = options.find((opt) => String(opt.value) === stringVal);

  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 7;

  // Determinar dirección de apertura (arriba o abajo) según el espacio disponible en pantalla
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (openDirection === 'up') {
        setDropUp(true);
      } else if (openDirection === 'down') {
        setDropUp(false);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 260 && spaceAbove > 260) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }

      // Auto-focus search input if searchable
      if (isSearchEnabled) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen, openDirection, isSearchEnabled]);

  // Cerrar al hacer clic o tap fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (optValue: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(optValue);
    setIsOpen(false);
  };

  const filteredOptions = isSearchEnabled && searchQuery.trim() !== ''
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div
      ref={containerRef}
      className={`relative w-full custom-select-container ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Botón activador que se integra 100% con el sistema de diseño ERP */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`form-control !flex !items-center !justify-between !text-left cursor-pointer select-none transition-all ${
          isOpen ? '!border-indigo-500 !shadow-[0_0_0_3px_rgba(99,102,241,0.25)]' : ''
        } ${className}`}
      >
        <span
          className={`truncate text-sm font-medium ${
            !selectedOption || selectedOption.value === '' ? 'text-white/40' : 'text-white'
          }`}
        >
          {selectedOption && selectedOption.value !== '' ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 ml-2 text-indigo-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Menú desplegable integrado en el DOM - NUNCA genera ventanas emergentes nativas del OS */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          tabIndex={-1}
          className={`absolute left-0 right-0 z-[9999] rounded-xl bg-[#0e111a] border border-white/10 shadow-2xl backdrop-blur-2xl py-1 custom-select-dropdown animate-fadeIn ${
            dropUp ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
          }`}
          style={{
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Barra de búsqueda integrada si hay múltiples opciones */}
          {isSearchEnabled && (
            <div className="p-2 border-b border-white/5">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-white/40 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar opción..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Lista de opciones scrolleable */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted text-center">
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === stringVal;
                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value, opt.disabled)}
                    className={`px-3 py-2 text-xs md:text-sm cursor-pointer flex items-center justify-between transition-colors ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-muted'
                        : isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                        : 'text-white/80 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-muted">{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-indigo-400 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
