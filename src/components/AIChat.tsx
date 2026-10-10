import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  FileDown, 
  FileText, 
  TrendingUp, 
  Package, 
  BarChart, 
  Users,
  Brain,
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import * as XLSX from 'xlsx';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Message {
  role: 'user' | 'model';
  text: string;
  isAction?: boolean;
  actionData?: any;
  isPdfAction?: boolean;
  pdfType?: 'users' | 'sales' | 'products' | 'general';
  isStreaming?: boolean;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Bienvenido a **Softplus Enterprise**! 🚀 Soy tu asistente comercial de élite. Estoy conectado a tu base de datos en tiempo real para ayudarte a escalar tu negocio. ¿Qué tal si analizamos las ventas de hoy o generamos un reporte de inventario?' }
  ]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { currency } = useSettings();

  const quickPrompts = [
    { label: 'Analizar Ventas', icon: TrendingUp, text: '¿Cómo van las ventas totales y cuál es el rendimiento del equipo?' },
    { label: 'Stock Crítico', icon: Package, text: '¿Qué productos tienen stock bajo y necesitan reposición urgente?' },
    { label: 'Reporte PDF', icon: FileText, text: 'Genera un reporte PDF detallado con el estado actual del negocio.' },
    { label: 'Exportar Excel', icon: FileDown, text: 'Necesito descargar el historial detallado de ventas en formato Excel.' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, streamingText, loading]);

  const downloadExcel = (data: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generatePDF = (type: 'users' | 'sales' | 'products' | 'general', context: any) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFillColor(250, 245, 240);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Gestión Softplus", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Sistema Comercial Digital", 20, 35);
    doc.setDrawColor(200);
    doc.line(20, 37, 190, 37);
    
    doc.setTextColor(0);
    doc.text(`Responsable: ${user?.full_name || "Administrador"}`, 20, 45);
    doc.text(`Fecha de Emisión: ${date}`, 20, 50);

    let currentY = 65;

    const addSection = (title: string, headers: string[][], body: any[][]) => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), 20, currentY);
      currentY += 5;
      
      autoTable(doc, {
        startY: currentY,
        head: headers,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        styles: { fontSize: 8 },
        margin: { left: 20, right: 20 }
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
    };

    if (type === 'products' || type === 'general') {
      const body = context.products.map((p: any) => [p.name, p.category, `${currency.symbol} ${p.price}`, p.stock]);
      addSection("Estado de Inventario", [["PRODUCTO", "CATEGORÍA", "PRECIO", "STOCK"]], body);
    }

    if (type === 'sales' || type === 'general') {
      const body = context.detailedSales.map((s: any) => [s.id, s.seller, s.customer || '-', `${currency.symbol} ${s.total}`, new Date(s.created_at).toLocaleDateString()]);
      addSection("Historial de Transacciones", [["ID", "VENDEDOR", "CLIENTE", "TOTAL", "FECHA"]], body);
    }

    if (type === 'users' || type === 'general') {
      const body = context.users.map((u: any) => [u.username, u.full_name, u.role]);
      addSection("Personal Autorizado", [["USUARIO", "NOMBRE", "ROL"]], body);
    }

    doc.save(`Softplus_Reporte_${type}_${new Date().getTime()}.pdf`);
  };

  const handleSend = async (customPrompt?: string) => {
    const userMessage = customPrompt || input.trim();
    if (!userMessage || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);
    setStreamingText('');

    try {
      const systemContext = await apiFetch('/api/ai/context');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `
        Eres el "Asistente Comercial de Élite" de Softplus Enterprise. 
        TONO: Profesional, estratégico, proactivo y entusiasta.
        OBJETIVO: Ayudar a ${user?.full_name} (${user?.role}) a optimizar el negocio.

        ESTADÍSTICAS REALES:
        - Moneda local: ${systemContext.systemInfo.currency}
        - Total Ventas: ${systemContext.totalStats.count}
        - Ingresos Totales: ${systemContext.systemInfo.currency} ${systemContext.totalStats.revenue.toFixed(2)}
        
        INVENTARIO: ${JSON.stringify(systemContext.products)}
        PERSONAL: ${JSON.stringify(systemContext.users)}
        VENTAS RECIENTES: ${JSON.stringify(systemContext.detailedSales)}
        
        COMANDOS ESPECIALES:
        - Si el usuario pide un Excel, genera el texto y añade [ACTION_DOWNLOAD_EXCEL].
        - Si pide un reporte PDF o informe formal, usa:
          [ACTION_PDF_USERS], [ACTION_PDF_SALES], [ACTION_PDF_PRODUCTS] o [ACTION_PDF_GENERAL].
        
        REGLAS DE RESPUESTA:
        1. Responde SIEMPRE en español.
        2. Usa Markdown denso (**negritas**, listas).
        3. Integra emojis estratégicamente.
        4. Sé analítico: si ves stock bajo o ventas cayendo, menciónalo.
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction }
      });

      const result = await chat.sendMessageStream({
        message: userMessage
      });

      let fullResponse = '';
      for await (const chunk of result) {
        const text = chunk.text;
        fullResponse += text;
        setStreamingText(fullResponse);
      }

      const hasExcelAction = fullResponse.includes('[ACTION_DOWNLOAD_EXCEL]');
      const pdfType = fullResponse.includes('[ACTION_PDF_USERS]') ? 'users' :
                      fullResponse.includes('[ACTION_PDF_SALES]') ? 'sales' :
                      fullResponse.includes('[ACTION_PDF_PRODUCTS]') ? 'products' :
                      fullResponse.includes('[ACTION_PDF_GENERAL]') ? 'general' : null;

      const finalContent = fullResponse
        .replace(/\[ACTION_DOWNLOAD_EXCEL\]/g, '')
        .replace(/\[ACTION_PDF_\w+\]/g, '')
        .trim();

      setMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          text: finalContent,
          isAction: hasExcelAction,
          actionData: systemContext.detailedSales,
          isPdfAction: !!pdfType,
          pdfType: pdfType as any
        }
      ]);
      setStreamingText('');

    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'model', text: "❌ Error de conexión con la red neuronal comercial. Por favor, verifica tu conexión o intenta en unos momentos." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón Flotante con efecto Glow */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-brand dark:bg-brand text-white rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center hover:bg-brand-muted dark:hover:bg-brand-muted hover:scale-110 active:scale-95 transition-all z-50 group overflow-hidden"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 opacity-20 bg-[conic-gradient(from_0deg,transparent,white,transparent)]"
        />
        <Brain className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform relative z-10" />
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 z-20" 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 40, filter: 'blur(10px)' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 w-full h-[100dvh] sm:bottom-28 sm:right-8 sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:h-[650px] sm:max-h-[80vh] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 flex flex-col z-[100] overflow-hidden"
          >
            {/* Header Técnico */}
            <div className="p-6 bg-gradient-to-r from-brand via-brand-muted to-brand text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-lg tracking-tight italic uppercase">AI Core v3.0</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand/20 opacity-80">Online • Data Synced</span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }} 
                className="p-3 hover:bg-white/20 rounded-2xl transition-all border border-transparent hover:border-white/10 active:scale-95 group relative z-[110]"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Mensajes con Staggered Entrance */}
            <div 
              ref={scrollRef} 
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar"
            >
              {messages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-3xl text-sm shadow-sm border ${
                    m.role === 'user' 
                      ? 'bg-brand text-white border-brand-muted rounded-tr-none' 
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-800 rounded-tl-none'
                  }`}>
                    <div className="prose prose-slate prose-sm dark:prose-invert max-w-none">
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                  
                  {/* Acciones Generadas */}
                  {(m.isAction || m.isPdfAction) && (
                    <div className="flex flex-wrap gap-2 mt-3 items-start animate-in fade-in slide-in-from-top-2">
                      {m.isAction && (
                        <button
                          onClick={() => downloadExcel(m.actionData)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95"
                        >
                          <FileDown className="w-4 h-4" />
                          Descargar Excel
                        </button>
                      )}
                      {m.isPdfAction && m.pdfType && (
                        <button
                          onClick={async () => {
                            const context = await apiFetch('/api/ai/context');
                            generatePDF(m.pdfType!, context);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
                        >
                          <FileText className="w-4 h-4" />
                          PDF: {m.pdfType.toUpperCase()}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Streaming Content */}
              {streamingText && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] p-4 rounded-3xl text-sm shadow-sm border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-brand/20 dark:border-brand/40 rounded-tl-none border-dashed animate-pulse-soft">
                    <div className="prose prose-slate prose-sm dark:prose-invert max-w-none">
                      <Markdown>{streamingText}</Markdown>
                    </div>
                  </div>
                </div>
              )}

              {loading && !streamingText && (
                <div className="flex justify-start">
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl rounded-tl-none shadow-xl border border-brand/20 dark:border-brand/40 flex items-center gap-4">
                    <div className="relative">
                      <Loader2 className="w-5 h-5 animate-spin text-brand" />
                      <div className="absolute inset-0 animate-ping bg-brand/30 rounded-full opacity-20" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand dark:text-brand">Analizando Engine</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Cruce de datos comerciales...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input y Sugerencias */}
            <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-4">
              {!loading && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mask-fade-right -mx-2 px-2">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p.text)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-brand/10 dark:hover:bg-brand/20 hover:border-brand/30 dark:hover:border-brand/50 transition-all group shadow-sm active:scale-95"
                    >
                      <p.icon className="w-3.5 h-3.5 text-brand group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400 group-hover:text-brand whitespace-nowrap">{p.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => !loading && e.key === 'Enter' && handleSend()}
                  placeholder="Ej: ¿Qué productos debo reponer?"
                  className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-900 dark:text-white placeholder:text-slate-400 min-w-0"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 flex-shrink-0 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 flex items-center justify-center hover:bg-brand-muted disabled:opacity-50 disabled:grayscale transition-all active:scale-95 group"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
