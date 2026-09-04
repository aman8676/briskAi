import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Database,
  Search,
  Sliders,
  ShieldCheck,
  Cpu,
  Layers,
  FileText,
  CheckCircle2,
  Terminal,
  Zap,
  Lock,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Menu,
  X,
  Play,
} from 'lucide-react';
import ParticleDrift from './ui/particle-drift';
import ThemeToggle from './ThemeToggle';

export default function LandingPage({ enterAuth, enterApp, isAuthenticated, onSignOut, theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [interactiveSpeed, setInteractiveSpeed] = useState(1);
  const [simQuery, setSimQuery] = useState('How does semantic vector search filter chunk candidates?');
  const [simActive, setSimActive] = useState(false);

  const isDark = theme === 'dark';

  const screenshots = [
    {
      id: 'pipeline',
      title: 'End-to-End Ingestion & Retrieval Pipeline',
      badge: 'Core Workflow',
      src: '/images/rag-pipeline.png',
      desc: 'Seamlessly processes multi-format documents (PDF, DOCX, TXT, Excel, PPTX, Images) with recursive splitting, Ollama nomic-embed-text generation, and Cosine Distance indexing.',
      highlights: [
        'Multi-format file & folder batch upload with client-side ZIP packaging',
        '768-dimensional dense vector embeddings generated via local Ollama',
        'High-dimensional pgvector cosine distance nearest-neighbor queries',
        'Dynamic context synthesis feeding local Llama 3.2 models',
      ],
    },
    {
      id: 'security',
      title: 'Multi-Tenant Security & Enterprise Guardrails',
      badge: 'Zero-Trust Isolation',
      src: '/images/rag-security.png',
      desc: 'Ensures absolute privacy. Document embeddings and chat transcripts are strictly isolated by cryptographic user ownership IDs in PostgreSQL with row-level association guards.',
      highlights: [
        'Strict many-to-many user-document isolation tables',
        'Relevance scoring thresholding (rejects hallucinated or unrelated text)',
        'Local Ollama inference ensures zero cloud data leakage or external telemetry',
        'Bcrypt encrypted authentication with JWT bearer sessions',
      ],
    },
    {
      id: 'servers',
      title: 'Distributed Neural Indexing & High-Throughput Compute',
      badge: 'High Performance',
      src: '/images/rag-servers.jpg',
      desc: 'Engineered for rapid sub-50 millisecond retrieval across thousands of vectorized document chunks with hardware-accelerated matrix operations.',
      highlights: [
        'Unified single-server container hosting React SPA and FastAPI backend',
        'Async streaming responses with real-time SSE token delivery',
        'CrossEncoder neural reranking for precision precision scoring',
        'Automated database migration and host network bridge fallback',
      ],
    },
  ];

  const currentScreenshot = screenshots.find((s) => s.id === activeTab) || screenshots[0];

  const handleSimulate = (e) => {
    e?.preventDefault();
    setSimActive(true);
    setTimeout(() => setSimActive(false), 2400);
  };

  return (
    <div
      className={`min-h-screen font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300 ${
        isDark ? "bg-[#030509] text-slate-100" : "bg-[#f8fafc] text-slate-900"
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ========================================================================= */}
      <nav
        className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
          isDark
            ? "bg-[#030509]/80 border-slate-800/80 text-white"
            : "bg-white/85 border-slate-200 text-slate-900 shadow-xs"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/25">
              ◈
            </div>
            <div>
              <span className=" text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
                RAG STUDIO
              </span>
              <span
                className={`block text-[10px] tracking-widest font-mono uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Neural Document Intelligence
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#architecture"
              className={`transition-colors ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"}`}
            >
              Architecture
            </a>
            <a
              href="#features"
              className={`transition-colors ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"}`}
            >
              Features
            </a>
            <a
              href="#faq"
              className={`transition-colors ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-indigo-600"}`}
            >
              FAQ
            </a>
          </div>

          {/* Right End: Theme Toggle & Sign in / Sign out Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={enterApp}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                >
                  Go to Workspace
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    isDark
                      ? "border-slate-700 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
                      : "border-slate-200 text-rose-600 hover:bg-rose-50"
                  }`}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={enterAuth}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    isDark
                      ? "border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={enterAuth}
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-600/25 transition-all items-center gap-1.5"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden px-6 py-4 border-b space-y-3 ${
              isDark
                ? "bg-slate-950 border-slate-800"
                : "bg-white border-slate-200"
            }`}
          >
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium py-1"
            >
              Architecture
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium py-1"
            >
              Features
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium py-1"
            >
              FAQ
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  enterAuth();
                }}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-indigo-600 text-white"
              >
                Sign in / Create Account
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION WITH EMBEDDED PARTICLE DRIFT BACKGROUND */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center justify-center pt-14 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8">
        {/* Background Particle Drift Canvas */}
        {/* <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <ParticleDrift
            mode={theme === 'light' ? 'light' : 'dark'}
            speed={interactiveSpeed}
            className="w-full h-full"
          />
        </div> */}

        {/* Lighter Theme Gradient Overlay for pristine text readability */}
        {/* <div
          className={`absolute inset-0 z-1 pointer-events-none transition-colors duration-300 ${
            isDark
              ? 'bg-gradient-to-b from-[#030509]/20 via-transparent to-[#030509]/60'
              : 'bg-gradient-to-b from-white/20 via-transparent to-[#f8fafc]/60'
          }`}
        /> */}

        {/* Glow ambient accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none z-1" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[300px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none z-1" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {/* <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border border-indigo-400/30 bg-indigo-500/10 text-indigo-400 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              Full-Stack Unified Retrieval-Augmented Generation
            </div> */}

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-md ${
                isDark
                  ? "bg-slate-900/80 border-slate-700/80 text-slate-300"
                  : "bg-white/85 border-slate-300 text-slate-700"
              }`}
            >
              <span className="text-[10px] text-slate-400">Drift Speed:</span>
              <button
                type="button"
                onClick={() => setInteractiveSpeed(0.5)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  interactiveSpeed === 0.5
                    ? "bg-indigo-600 text-white"
                    : "hover:text-indigo-400"
                }`}
              >
                0.5x
              </button>
              <button
                type="button"
                onClick={() => setInteractiveSpeed(1)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  interactiveSpeed === 1
                    ? "bg-indigo-600 text-white"
                    : "hover:text-indigo-400"
                }`}
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => setInteractiveSpeed(2)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  interactiveSpeed === 2
                    ? "bg-indigo-600 text-white"
                    : "hover:text-indigo-400"
                }`}
              >
                2x
              </button>
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.1] mb-6">
            Audit Every Chunk. <span className="">Verify Every Answer.</span>
          </h1>

          <p
            className={`max-w-3xl mx-auto text-base font-extralight sm:text-xl leading-relaxed mb-10 ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            A high-precision RAG Studio combining local Ollama neural
            embeddings, PostgreSQL vector distance searching, and CrossEncoder
            rerankers. Inspect every chunk trace before generating answers.
          </p>

          {/* Proper Spaced CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-14">
            <button
              type="button"
              onClick={isAuthenticated ? enterApp : enterAuth}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold bg-slate-900/80 text-base  text-white hover:from-indigo-500 hover:to-sky-500 shadow-xl  transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <span>
                {isAuthenticated ? "Open Studio Workspace" : "Get Started Free"}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#architecture"
              className={`w-full sm:w-auto px-7 py-4 rounded-2xl font-semibold text-base border transition-all flex items-center justify-center gap-2 ${
                isDark
                  ? "border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-slate-700"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs"
              }`}
            >
              <span>Explore Architecture</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Key Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div
              className={`p-4 rounded-2xl border ${
                isDark
                  ? "bg-slate-900/50 border-slate-800/80"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="text-2xl sm:text-3xl ">768-D</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                Nomic Embeddings
              </div>
            </div>
            <div
              className={`p-4 rounded-2xl border ${
                isDark
                  ? "bg-slate-900/50 border-slate-800/80"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="text-2xl sm:text-3xl">
                &lt; 50ms
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                Vector Search Latency
              </div>
            </div>
            <div
              className={`p-4 rounded-2xl border ${
                isDark
                  ? "bg-slate-900/50 border-slate-800/80"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="text-2xl sm:text-3xl ">100%</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                Local Data Privacy
              </div>
            </div>
            <div
              className={`p-4 rounded-2xl border ${
                isDark
                  ? "bg-slate-900/50 border-slate-800/80"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="text-2xl sm:text-3xl ">
                Unified
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">
                Frontend + Backend Server
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. VISUAL RAG ARCHITECTURE SHOWCASE (WITH SCREENSHOTS) */}
      {/* ========================================================================= */}
      <section
        id="architecture"
        className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <Layers className="w-3.5 h-3.5" />
            System Blueprints
          </div>
          <h2 className="text-3xl sm:text-4xl  tracking-tight">
            Visual RAG Architecture & Ingestion Flow
          </h2>
          <p
            className={`mt-3 text-base sm:text-lg ${isDark ? "text-slate-400" : "text-slate-600"}`}
          >
            Click through our architectural diagrams below to explore how
            knowledge ingestion, cryptographic security, and neural compute work
            in unison.
          </p>
        </div>

        {/* Screenshot Tab Selector */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {screenshots.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-5 py-3 rounded-2xl text-sm font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                      : "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                    : isDark
                      ? "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700"
                      : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>{item.title}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isSelected
                      ? isDark
                        ? "bg-indigo-500/30 text-indigo-300"
                        : "bg-indigo-200 text-indigo-800"
                      : isDark
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Architecture Display Card */}
        <div
          className={`rounded-3xl border overflow-hidden transition-all duration-300 shadow-2xl ${
            isDark
              ? "bg-slate-900/80 border-slate-800"
              : "bg-white border-slate-200 shadow-slate-200/60"
          }`}
        >
          <div className="grid lg:grid-cols-12 gap-8 p-6 sm:p-8 lg:p-10 items-center">
            {/* Left Description */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
                  {currentScreenshot.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight">
                  {currentScreenshot.title}
                </h3>
                <p
                  className={`mt-3 text-sm sm:text-base leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}
                >
                  {currentScreenshot.desc}
                </p>
              </div>

              {/* Highlights */}
              <div className="space-y-3 pt-2">
                {currentScreenshot.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={isDark ? "text-slate-200" : "text-slate-700"}
                    >
                      {h}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA inside architecture card */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={isAuthenticated ? enterApp : enterAuth}
                  className="px-6 py-3 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  Inspect This Stage in Workspace
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Image Viewer */}
            <div className="lg:col-span-7">
              <div
                className={`relative rounded-2xl overflow-hidden border p-2 group transition-all ${
                  isDark
                    ? "bg-slate-950 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <img
                  src={currentScreenshot.src}
                  alt={currentScreenshot.title}
                  className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-lg transition-transform duration-500 group-hover:scale-[1.01]"
                />
                <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-mono text-slate-300 border border-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Architecture Vector
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE RAG SIMULATOR (QUERY TO CHUNK TESTER) */}
      {/* ========================================================================= */}
      <section
        id="pipeline-flow"
        className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <Terminal className="w-3.5 h-3.5" />
            Live Query Simulator
          </div>
          <h2 className="text-3xl sm:text-4xl  tracking-tight">
            Experience Transparent Retrieval
          </h2>
          <p
            className={`mt-3 text-base sm:text-lg ${isDark ? "text-slate-400" : "text-slate-600"}`}
          >
            Type a query or select a preset to see the 5 discrete pipeline
            stages executed in real-time.
          </p>
        </div>

        <div
          className={`rounded-3xl border p-6 sm:p-10 shadow-2xl ${
            isDark
              ? "bg-slate-900/90 border-slate-800"
              : "bg-white border-slate-200 shadow-slate-200/70"
          }`}
        >
          {/* Query Form */}
          <form
            onSubmit={handleSimulate}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={simQuery}
                onChange={(e) => setSimQuery(e.target.value)}
                placeholder="Ask a technical or legal document question..."
                className={`w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm border outline-none transition-all ${
                  isDark
                    ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
                    : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={simActive}
              className="px-8 py-3.5 rounded-2xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-60"
            >
              {simActive ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Simulate Pipeline</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-slate-400">Try sample queries:</span>
            {[
              "What is the refund and cancellation policy in Section 4.2?",
              "How does pgvector cosine distance calculate nearest neighbors?",
              "Explain the CrossEncoder thresholding formula for chunk rejection.",
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSimQuery(q)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                  isDark
                    ? "border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Simulated 5-Step Pipeline Results */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
            {[
              {
                step: "1",
                title: "Query Rewriting",
                detail:
                  "Context-free standalone query parsed from chat memory.",
                status: "100% Resolved",
              },
              {
                step: "2",
                title: "Ollama Embedding",
                detail:
                  "768-D dense float32 vector generated via nomic-embed-text.",
                status: "Generated in 18ms",
              },
              {
                step: "3",
                title: "pgvector Search",
                detail:
                  "Top 10 candidates filtered using cosine distance < 0.35.",
                status: "10 Chunks Found",
              },
              {
                step: "4",
                title: "CrossEncoder Rerank",
                detail:
                  "Full pairwise token cross-attention ordered top 5 chunks.",
                status: "Relevance Score: 0.94",
              },
              {
                step: "5",
                title: "Context Assembly",
                detail:
                  "Approved chunk tokens injected into Llama 3.2 system prompt.",
                status: "Ready for LLM",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  simActive ? "animate-pulse border-indigo-500/50" : ""
                } ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {item.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                <p
                  className={`text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}
                >
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FEATURES GRID */}
      {/* ========================================================================= */}
      <section
        id="features"
        className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <Sliders className="w-3.5 h-3.5" />
            Full-Stack Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl  tracking-tight">
            Designed for Production-Grade Accuracy
          </h2>
          <p
            className={`mt-3 text-base sm:text-lg ${isDark ? "text-slate-400" : "text-slate-600"}`}
          >
            Everything you need to run, audit, and optimize self-hosted RAG
            without cloud lock-in.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div
            className={`p-8 rounded-3xl border transition-all hover:translate-y-[-2px] ${
              isDark
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              Automated Document Ingestion
            </h3>
            <p
              className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              Upload individual files or entire directory trees. Supports PDF,
              DOCX, CSV, Excel, TXT, JSON, and images with automatic recursive
              splitting.
            </p>
          </div>

          <div
            className={`p-8 rounded-3xl border transition-all hover:translate-y-[-2px] ${
              isDark
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-6">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Native pgvector Indexing</h3>
            <p
              className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              Stores high-density vectors directly alongside relational metadata
              in PostgreSQL 18. Zero external SaaS vector databases needed.
            </p>
          </div>

          <div
            className={`p-8 rounded-3xl border transition-all hover:translate-y-[-2px] ${
              isDark
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Relevance Guardrails</h3>
            <p
              className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              Enforces strict similarity and reranking cutoffs. If retrieved
              chunks are not verifiably related to the query, RAG Studio cleanly
              falls back rather than hallucinating.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      {/* ========================================================================= */}
      <section
        id="faq"
        className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
      >
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            Clear Answers
          </div>
          <h2 className="text-3xl sm:text-4xl  tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How does the single unified Docker container work?",
              a: "A multi-stage Dockerfile compiles the React frontend with Vite in stage 1, then mounts the production build directly into FastAPI in stage 2. A single container port (8000) serves both the REST API, SPA routing, and static assets.",
            },
            {
              q: "Can this run completely offline without an internet connection?",
              a: "Yes! Ollama models (such as llama3.2:1b and nomic-embed-text) and PostgreSQL run completely locally. Once models are cached, all embeddings, chunking, and inference execute on your own machine with zero data leaving your network.",
            },
            {
              q: "How does RAG Studio prevent document hallucination?",
              a: "Before sending retrieved chunks to the LLM, a strict relevance check compares cosine distance and CrossEncoder pairwise scores. If the best retrieved score falls below our relevance cutoff, the system alerts you and refuses to pass incorrect context.",
            },
          ].map((item, index) => (
            <details
              key={index}
              className={`p-6 rounded-2xl border transition-all ${
                isDark
                  ? "bg-slate-900/60 border-slate-800"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <summary className="font-bold text-base cursor-pointer select-none flex items-center justify-between">
                <span>{item.q}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 transition-transform details-open:rotate-90" />
              </summary>
              <p
                className={`mt-4 text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. BOTTOM CONVERSION CTA BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div
          className={`relative overflow-hidden rounded-3xl p-10 sm:p-16 text-center border shadow-2xl ${
            isDark
              ? "bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-slate-800"
              : "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white border-indigo-500"
          }`}
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl  tracking-tight relative z-10 mb-4">
            Ready to Supercharge Your Document Intelligence?
          </h2>
          <p
            className={`max-w-2xl mx-auto text-base sm:text-lg mb-10 relative z-10 ${
              isDark ? "text-slate-300" : "text-indigo-100"
            }`}
          >
            Launch the unified workspace now. Ingest folders, audit chunk
            distributions, inspect rerankings, and query verified facts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button
              type="button"
              onClick={isAuthenticated ? enterApp : enterAuth}
              className="w-full sm:w-auto px-9 py-4 rounded-2xl font-bold text-base bg-white text-indigo-950 hover:bg-slate-100 shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>
                {isAuthenticated
                  ? "Open Studio Workspace"
                  : "Sign in to Workspace"}
              </span>
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FOOTER */}
      {/* ========================================================================= */}
      <footer
        className={`border-t py-12 px-4 sm:px-6 lg:px-8 transition-colors ${
          isDark ? "border-slate-900 bg-[#030509]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">
              ◈
            </div>
            <span className="font-bold text-sm tracking-tight">
              RAG STUDIO • Brisk AI
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Self-Hosted Multi-Stage RAG Pipeline with pgvector & Ollama.
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <a
              href="#architecture"
              className="hover:text-indigo-400 transition-colors"
            >
              Architecture
            </a>
            <a
              href="#features"
              className="hover:text-indigo-400 transition-colors"
            >
              Features
            </a>
            <button
              onClick={isAuthenticated ? enterApp : enterAuth}
              className="text-indigo-400 hover:underline"
            >
              {isAuthenticated ? "Workspace" : "Sign in"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
