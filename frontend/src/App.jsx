import React, { useEffect, useState } from "react";
import JSZip from "jszip";
import {
  FileText,
  Layers,
  Cpu,
  Info,
  GitPullRequest,
  MessageSquare,
  Trash2,
  LogOut,
  Upload,
  Plus,
  Home,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import SignOutModal from "./components/SignOutModal";
import ThemeToggle from "./components/ThemeToggle";

const API = import.meta.env.VITE_API_URL ?? "https://rag-studio.amanjalan.tech";

const nav = [
  ["overview", "Overview", FileText],
  ["chunks", "Chunks", Layers],
  ["embeddings", "Embeddings", Cpu],
  ["metadata", "Metadata", Info],
  ["pipeline", "Retrieval flow", GitPullRequest],
  ["chat", "Ask your documents", MessageSquare],
  ["remove", "Remove document", Trash2],
];

const request = async (path, options = {}) => {
  const token = localStorage.getItem("rag_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || "Request failed");
  }
  return response.json();
};

export default function App() {
  const [screen, setScreen] = useState(
    localStorage.getItem("rag_token") ? "app" : "landing",
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("rag_theme") || "dark",
  );
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Sync theme changes to documentElement
  useEffect(() => {
    localStorage.setItem("rag_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.style.colorScheme = "light";
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleSignOutConfirm = async () => {
    setShowSignOutModal(false);
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("rag_token");
      setScreen("landing");
    }
  };

  return (
    <>
      {screen === "landing" && (
        <LandingPage
          enterAuth={() => setScreen("auth")}
          enterApp={() => setScreen("app")}
          isAuthenticated={Boolean(localStorage.getItem("rag_token"))}
          onSignOut={() => setShowSignOutModal(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {screen === "auth" && (
        <AuthPage
          onDone={() => setScreen("app")}
          onBackToLanding={() => setScreen("landing")}
          request={request}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {screen === "app" && (
        <Dashboard
          onLogoutClick={() => setShowSignOutModal(true)}
          onHomeClick={() => setScreen("landing")}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Customized Dynamic Sign Out Modal */}
      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOutConfirm}
        theme={theme}
      />
    </>
  );
}

function Dashboard({ onLogoutClick, onHomeClick, theme, toggleTheme }) {
  const [page, setPage] = useState("overview");
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState([]);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");
  const [retrievalTrace, setRetrievalTrace] = useState(null);
  const [sourceBadge, setSourceBadge] = useState("");

  const isDark = theme === "dark";

  const loadDocs = async () => {
    try {
      const result = await request("/documents");
      setDocuments(result);
      if (!selected && result.length > 0) setSelected(null);
    } catch (e) {
      setNotice(e.message);
    }
  };

  const loadChats = async () => {
    try {
      setChats(await request("/chats"));
    } catch {}
  };

  useEffect(() => {
    loadDocs();
    loadChats();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const endpoint =
      page === "chunks"
        ? "chunks"
        : page === "embeddings"
          ? "embeddings"
          : page === "metadata"
            ? "metadata"
            : null;
    if (endpoint) {
      request(`/documents/${selected.id}/${endpoint}`)
        .then((x) => setDetail(Array.isArray(x) ? x : [x]))
        .catch((e) => setNotice(e.message));
    }
  }, [page, selected]);

  const upload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (
        files.length > 1 ||
        (files[0].webkitRelativePath &&
          files[0].webkitRelativePath.includes("/"))
      ) {
        setNotice("Packaging folder into ZIP archive...");
        const zip = new JSZip();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const relativePath = file.webkitRelativePath || file.name;
          zip.file(relativePath, file);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipFile = new File([zipBlob], "documents.zip", {
          type: "application/zip",
        });

        const data = new FormData();
        data.append("file", zipFile);
        setNotice("Uploading and generating 768-D dense embeddings...");
        const response = await request("/upload", {
          method: "POST",
          body: data,
        });
        await loadDocs();
        setNotice(
          `Bulk upload completed! Processed: ${response.total_processed} document(s)${
            response.failed_count > 0
              ? `, Failed: ${response.failed_count}`
              : ""
          }`,
        );
      } else {
        const file = files[0];
        const data = new FormData();
        data.append("file", file);

        const isZip = file.name.toLowerCase().endsWith(".zip");
        setNotice(
          isZip
            ? "Processing ZIP archives..."
            : "Creating embeddings via Ollama nomic-embed-text...",
        );
        const response = await request("/upload", {
          method: "POST",
          body: data,
        });
        await loadDocs();
        setNotice(
          isZip
            ? `Bulk upload completed! Processed: ${response.total_processed} document(s)`
            : "Document successfully parsed, chunked, and vectorized!",
        );
      }
    } catch (err) {
      setNotice(err.message);
    }
    e.target.value = "";
  };

  const createChat = async () => {
    try {
      const c = await request("/chat/new", { method: "POST" });
      setChatId(c.chat_id);
      setMessages([]);
      await loadChats();
      setPage("chat");
    } catch (e) {
      setNotice(e.message);
    }
  };

  const openChat = async (id) => {
    setChatId(id);
    setPage("chat");
    try {
      setMessages(await request(`/chat/${id}/history`));
    } catch (e) {
      setNotice(e.message);
    }
  };

  const extractSourceDocument = (content) => {
    if (!content) return "";
    const match = content.match(/(?:^|\n)Source document:\s*(.+)$/i);
    return match ? match[1].trim() : "";
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    let id = chatId;
    if (!id) {
      const c = await request("/chat/new", { method: "POST" });
      id = c.chat_id;
      setChatId(id);
      await loadChats();
    }
    const text = question;
    setQuestion("");
    setRetrievalTrace(null);
    setSourceBadge("");
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      const trace = await request("/retrieval/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          document_id: selected?.id ?? null,
        }),
      });
      setRetrievalTrace(trace);

      const token = localStorage.getItem("rag_token");
      const r = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chat_id: id,
          message: text,
          document_id: selected?.id ?? null,
        }),
      });
      if (!r.ok)
        throw new Error(
          (await r.json().catch(() => ({}))).detail || "Chat request failed",
        );

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value);
        const extracted = extractSourceDocument(answer);
        if (extracted) setSourceBadge(extracted);
        setMessages((m) => [
          ...m.slice(0, -1),
          { role: "assistant", content: answer },
        ]);
      }
    } catch (err) {
      setNotice(err.message);
      setMessages((m) => m.slice(0, -1));
    }
  };

  const title = nav.find((n) => n[0] === page)?.[1];

  return (
    <div
      className={`min-h-screen lg:flex transition-colors duration-300 ${
        isDark ? "bg-[#030509] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Sidebar */}
      <aside
        className={`w-full lg:w-72 lg:min-h-screen p-5 flex flex-col justify-between border-r transition-colors ${
          isDark
            ? "bg-[#0a0f1d] border-slate-800/80 text-slate-300"
            : "bg-white border-slate-200 text-slate-700 shadow-sm"
        }`}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">
                ◈
              </div>
              <b
                className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
              >
                RAG STUDIO
              </b>
            </div>
            <button
              onClick={onHomeClick}
              title="Return to Landing Page"
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  : "border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
              }`}
            >
              <Home className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Dropzone */}
          <label
            className={`mt-6 block cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
              isDark
                ? "border-slate-700 bg-slate-900/50 hover:border-indigo-500 hover:bg-indigo-500/5"
                : "border-slate-300 bg-slate-50 hover:border-indigo-600 hover:bg-indigo-50/50"
            }`}
          >
            <input
              className="hidden"
              type="file"
              onChange={upload}
              multiple
              webkitdirectory=""
              accept=".pdf,.docx,.txt,.md,.json,.csv,.xlsx,.pptx,.html,.htm,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.zip"
            />
            <div className="w-8 h-8 mx-auto rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2">
              <Upload className="w-4 h-4" />
            </div>
            <span
              className={`block font-semibold text-xs ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Upload Files or Folder
            </span>
            <span className="mt-1 block text-[10px] text-slate-400">
              Auto-zips directories
            </span>
          </label>

          {/* Nav Items */}
          <div className="mt-6 space-y-1">
            {nav.map(([id, text, Icon]) => {
              const active = page === id;
              return (
                <button
                  key={id}
                  onClick={() => setPage(id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : isDark
                        ? "hover:bg-slate-800/80 text-slate-400 hover:text-white"
                        : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${active ? "text-white" : "text-slate-400"}`}
                  />
                  <span>{text}</span>
                </button>
              );
            })}
          </div>

          {/* Chat History Section */}
          <div
            className={`mt-8 pt-5 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span>Chat sessions</span>
              <button
                onClick={createChat}
                title="New Chat"
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {chats.length ? (
                chats.map((c) => (
                  <button
                    key={c.chat_id}
                    onClick={() => openChat(c.chat_id)}
                    className={`w-full block truncate rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      chatId === c.chat_id
                        ? "bg-indigo-500/20 text-indigo-400 font-semibold"
                        : isDark
                          ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                          : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Chat #{c.chat_id}
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-1">
                  No chats yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Sign Out */}
        <div
          className={`pt-4 mt-6 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}
        >
          <button
            onClick={onLogoutClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out of Workspace</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
        {/* Top Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
              Knowledge Workspace
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Document Selector */}
            {documents.length > 0 && (
              <select
                value={selected?.id ?? "all"}
                onChange={(e) =>
                  setSelected(
                    e.target.value === "all"
                      ? null
                      : documents.find((d) => d.id === +e.target.value),
                  )
                }
                className={`rounded-xl border px-3 py-2 text-xs font-medium outline-none transition-all ${
                  isDark
                    ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                    : "bg-white border-slate-300 text-slate-800 focus:border-indigo-600"
                }`}
              >
                <option value="all">
                  All uploaded documents ({documents.length})
                </option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.source_path || d.title}
                  </option>
                ))}
              </select>
            )}

            {/* Theme Toggle */}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

            {/* Top Bar Sign Out Button placed at the very end */}
            <button
              onClick={onLogoutClick}
              title="Sign out"
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? "border-slate-700 text-slate-300 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10"
                  : "border-slate-300 text-slate-700 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50"
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Global Notification Banner */}
        {notice && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 ${
              notice.includes("failed") || notice.includes("Failed")
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
            }`}
          >
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              className="text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Subpages */}
        <Page
          page={page}
          docs={documents}
          doc={selected}
          detail={detail}
          messages={messages}
          question={question}
          setQuestion={setQuestion}
          ask={ask}
          sourceBadge={sourceBadge}
          theme={theme}
        />
      </main>
    </div>
  );
}

function Page({
  page,
  docs,
  doc,
  detail,
  messages,
  question,
  setQuestion,
  ask,
  sourceBadge,
  theme,
}) {
  const isDark = theme === "dark";

  if (page === "remove")
    return <RemoveDocument docs={docs} selectedDocument={doc} theme={theme} />;
  if (page === "overview") {
    return (
      <div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Total Documents"
            value={docs.length}
            theme={theme}
            icon={<FileText className="w-5 h-5 text-indigo-400" />}
          />
          <Metric
            label="Vectorized Chunks"
            value={docs.reduce((n, d) => n + d.chunk_count, 0)}
            theme={theme}
            icon={<Layers className="w-5 h-5 text-sky-400" />}
          />
          <Metric
            label="Selected Document Chunks"
            value={doc?.chunk_count || "—"}
            suffix=" chunks"
            theme={theme}
            icon={<Cpu className="w-5 h-5 text-emerald-400" />}
          />
        </div>

        <section
          className={`mt-8 rounded-3xl border p-6 sm:p-8 transition-colors ${
            isDark
              ? "bg-slate-900/60 border-slate-800"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Your Ingested Documents</h2>
            <span className="text-xs text-slate-400 font-mono">
              {docs.length} files indexed
            </span>
          </div>

          {docs.length ? (
            <div className="space-y-3">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center justify-between rounded-2xl p-4 text-sm border transition-all ${
                    isDark
                      ? "bg-slate-950/80 border-slate-800"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="min-w-0 pr-4">
                    <p className="truncate font-semibold">
                      {d.source_path || d.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {d.chunk_count} dense 768-D chunks
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-400">
                    {d.source_path ? "Folder Batch" : "Single File"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4">
              Upload a document using the left sidebar dropzone to start the
              ingestion and embedding pipeline.
            </p>
          )}
        </section>
      </div>
    );
  }

  if (page === "pipeline")
    return <Pipeline docs={docs} selectedDoc={doc} theme={theme} />;
  if (page === "chat") {
    return (
      <ChatPanel
        doc={doc}
        messages={messages}
        question={question}
        setQuestion={setQuestion}
        ask={ask}
        sourceBadge={sourceBadge}
        theme={theme}
      />
    );
  }

  const heading =
    page === "chunks"
      ? "First 10 Chunks"
      : page === "embeddings"
        ? "Embedding Preview — First 5 Chunks"
        : "Document Metadata & Synthesis";

  return (
    <section>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {heading}
      </p>
      {doc ? (
        <div className="space-y-4">
          {detail.map((item, i) => (
            <article
              key={item.id || i}
              className={`rounded-2xl border p-5 sm:p-6 shadow-sm transition-colors ${
                isDark
                  ? "bg-slate-900/70 border-slate-800"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <b className="text-sm font-bold">
                  {page === "metadata"
                    ? item.title
                    : `Chunk ${item.chunk_index + 1}`}
                </b>
                {item.embedding_dimensions && (
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                    {item.embedding_dimensions} dimensions
                  </span>
                )}
              </div>

              {page === "metadata" ? (
                <>
                  <p className="text-xs text-slate-400">
                    Source: {item.source_path || item.source || "Unknown"} ·{" "}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : ""}
                  </p>
                  {item.index_markdown && (
                    <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200 whitespace-pre-wrap font-mono border border-slate-800">
                      {item.index_markdown}
                    </pre>
                  )}
                  {item.key_points && (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
                      {item.key_points.map((x, j) => (
                        <li key={j}>{x}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-6 opacity-90">
                    {item.content}
                  </p>
                  {item.embedding_preview && (
                    <code className="mt-4 block overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-emerald-400 font-mono border border-slate-800">
                      [
                      {item.embedding_preview
                        .map((n) => n.toFixed(4))
                        .join(", ")}
                      , …]
                    </code>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div
          className={`p-8 rounded-2xl border text-center ${
            isDark
              ? "bg-slate-900/40 border-slate-800 text-slate-400"
              : "bg-white border-slate-200 text-slate-500"
          }`}
        >
          Select a specific document from the top-right header selector to view
          its detailed chunks and embeddings.
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, suffix = "", icon, theme }) {
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-2xl border p-5 transition-colors ${
        isDark
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight">
        {value}
        <span className="text-sm font-normal text-slate-400 ml-1">
          {suffix}
        </span>
      </p>
    </div>
  );
}

function RemoveDocument({ docs, selectedDocument, theme }) {
  const isDark = theme === "dark";
  const [documentId, setDocumentId] = useState(
    selectedDocument?.id || (docs[0]?.id ?? ""),
  );
  const [error, setError] = useState("");

  const remove = async () => {
    const document = docs.find((item) => item.id === Number(documentId));
    if (!document) return;
    if (
      !window.confirm(
        `Permanently delete "${document.title}" and its vectorized embeddings from PostgreSQL?`,
      )
    )
      return;
    try {
      await request(`/documents/${document.id}`, { method: "DELETE" });
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section
      className={`max-w-xl rounded-3xl border p-6 sm:p-8 transition-colors ${
        isDark
          ? "bg-slate-900/70 border-slate-800"
          : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      <h2 className="font-bold text-xl text-rose-500 flex items-center gap-2">
        <Trash2 className="w-5 h-5" />
        Remove Document
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Deleting a document permanently removes all chunk records, metadata, and
        768-D embeddings from the database.
      </p>

      {docs.length ? (
        <>
          <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Document to Delete
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className={`mt-2 w-full rounded-xl border p-3 text-sm outline-none ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300"
              }`}
            >
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.source_path || d.title}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

          <button
            onClick={remove}
            className="mt-6 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
          >
            Permanently Delete Document
          </button>
        </>
      ) : (
        <p className="mt-6 text-sm text-slate-400">
          No documents are currently ingested.
        </p>
      )}
    </section>
  );
}

function ChatPanel({
  doc,
  messages,
  question,
  setQuestion,
  ask,
  sourceBadge,
  theme,
}) {
  const isDark = theme === "dark";

  const clearHistory = async () => {
    if (!window.confirm("Delete every saved chat conversation?")) return;
    try {
      await request("/chats", { method: "DELETE" });
      window.location.reload();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const currentSource =
    sourceBadge ||
    (doc ? doc.source_path || doc.title : "all uploaded documents");

  return (
    <section
      className={`flex min-h-[70vh] flex-col rounded-3xl border overflow-hidden transition-colors ${
        isDark
          ? "bg-slate-900/70 border-slate-800"
          : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      {/* Chat Header */}
      <div
        className={`flex items-center justify-between border-b p-5 ${isDark ? "border-slate-800" : "border-slate-200"}`}
      >
        <div>
          <b className="text-sm sm:text-base font-bold">RAG Document Agent</b>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Retrieval Scope:{" "}
            <span className="truncate max-w-[240px] font-semibold">
              {currentSource}
            </span>
          </div>
        </div>
        <button
          onClick={clearHistory}
          className="rounded-xl border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          Clear History
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 space-y-4 p-5 sm:p-6 overflow-y-auto max-h-[55vh]">
        {messages.length ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-3xl whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-indigo-600 text-white shadow-md"
                  : isDark
                    ? "bg-slate-950 border border-slate-800 text-slate-100"
                    : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content || "Generating fact-checked response from Ollama..."}
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-indigo-400/40" />
            Ask any question across your uploaded documents. Retrieved chunks
            are verified before answering.
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form
        onSubmit={ask}
        className={`flex gap-3 border-t p-4 sm:p-5 ${isDark ? "border-slate-800" : "border-slate-200"}`}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            doc
              ? `Ask about "${doc.title}"...`
              : "Ask across all uploaded documents..."
          }
          className={`min-w-0 flex-1 rounded-2xl border px-4 py-3.5 text-sm outline-none transition-all ${
            isDark
              ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
              : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600 focus:bg-white"
          }`}
        />
        <button className="rounded-2xl bg-indigo-600 px-6 font-semibold text-sm text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer">
          Send
        </button>
      </form>
    </section>
  );
}

function Pipeline({ docs, selectedDoc, theme }) {
  const steps = [
    [
      "Query rewriting",
      'Makes follow-up questions self-contained using prior messages so retrieval resolves "it" or "that".',
    ],
    [
      "Vector search",
      "Embeds the question with nomic-embed-text and queries the ten closest chunks via pgvector cosine distance.",
    ],
    [
      "Reranker",
      "CrossEncoder scores the query pairwise with candidates to yield the five most relevant chunks.",
    ],
    [
      "Relevance check",
      "Verifies the top similarity score exceeds the threshold before injecting any text into the LLM context.",
    ],
    [
      "Context writing",
      "Joins the approved chunk text with separators as the exact factual evidence for Llama 3.2.",
    ],
    [
      "Answer + memory",
      "Streams the answer to chat and saves both messages for conversational memory.",
    ],
  ];

  const [selectedStep, setSelectedStep] = useState(2);
  const [query, setQuery] = useState("");
  const [trace, setTrace] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState("");
  const [localDocId, setLocalDocId] = useState(
    selectedDoc?.id ?? docs?.[0]?.id ?? null,
  );

  useEffect(() => {
    request("/chats")
      .then(setChats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDoc?.id) setLocalDocId(selectedDoc.id);
  }, [selectedDoc]);

  const inspect = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      setTrace(
        await request("/retrieval/inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: query,
            document_id: localDocId || null,
            ...(chatId ? { chat_id: Number(chatId) } : {}),
          }),
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const active = steps[selectedStep];
  return (
    <PipelineInspector
      steps={steps}
      selectedStep={selectedStep}
      setSelectedStep={setSelectedStep}
      active={active}
      query={query}
      setQuery={setQuery}
      inspect={inspect}
      docs={docs}
      localDocId={localDocId}
      setLocalDocId={setLocalDocId}
      loading={loading}
      error={error}
      trace={trace}
      chats={chats}
      chatId={chatId}
      setChatId={setChatId}
      theme={theme}
    />
  );
}

function PipelineInspector({
  steps,
  selectedStep,
  setSelectedStep,
  active,
  query,
  setQuery,
  inspect,
  docs,
  localDocId,
  setLocalDocId,
  loading,
  error,
  trace,
  chats,
  chatId,
  setChatId,
  theme,
}) {
  const isDark = theme === "dark";

  return (
    <div className="space-y-6">
      <section
        className={`rounded-3xl border p-6 sm:p-8 transition-colors ${
          isDark
            ? "bg-slate-900/70 border-slate-800"
            : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-2">
          Stage Diagnostics
        </p>
        <h2 className="text-xl font-bold mb-4">
          Interactive Retrieval Pipeline Architecture
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(([title], index) => (
            <button
              key={title}
              onClick={() => setSelectedStep(index)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                selectedStep === index
                  ? "border-indigo-500 bg-indigo-500/10 shadow-sm"
                  : isDark
                    ? "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    : "border-slate-200 bg-slate-50 hover:border-indigo-300"
              }`}
            >
              <span className="text-xs font-mono font-bold text-indigo-400">
                STEP {index + 1}
              </span>
              <b className="mt-1 block text-sm">{title}</b>
            </button>
          ))}
        </div>

        <article className="mt-6 rounded-2xl bg-slate-950 p-5 text-white border border-slate-800">
          <p className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
            {active[0]}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {active[1]}
          </p>
        </article>
      </section>

      {/* Check Document Retrieval Form */}
      <section
        className={`rounded-3xl border p-6 sm:p-8 transition-colors ${
          isDark
            ? "bg-slate-900/70 border-slate-800"
            : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <h2 className="font-bold text-xl mb-1">
          Check Your Document Retrieval
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Inspect candidate vectors, similarity scores, and reranked context
          before triggering LLM generation.
        </p>

        <form onSubmit={inspect} className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Document Target (optional)
            <select
              value={localDocId ?? ""}
              onChange={(e) =>
                setLocalDocId(e.target.value ? Number(e.target.value) : null)
              }
              className={`mt-1.5 block w-full rounded-xl border p-3 text-sm outline-none ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300"
              }`}
            >
              <option value="">Search across all uploaded documents</option>
              {docs?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.source_path || d.title}
                </option>
              ))}
            </select>
          </label>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Question to Probe
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a question to trace chunk retrieval..."
              className={`w-full rounded-xl border p-3.5 text-sm outline-none ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600"
              }`}
            />
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Chat History Context for Rewriting (optional)
            <select
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className={`mt-1.5 block w-full rounded-xl border p-3 text-sm outline-none ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300"
              }`}
            >
              <option value="">No prior chat — standalone evaluation</option>
              {chats.map((chat) => (
                <option key={chat.chat_id} value={chat.chat_id}>
                  Chat #{chat.chat_id}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Checking Pipeline..." : "Run Check"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

        {trace && (
          <div className="mt-8 space-y-4 text-sm border-t pt-6 border-slate-800">
            <p
              className={`rounded-2xl p-4 font-medium border ${
                trace.relevant
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {trace.reason}
            </p>
            <TraceOutput
              label="Original Question"
              value={trace.original_query}
              isDark={isDark}
            />
            <TraceOutput
              label="Rewritten Standalone Query"
              value={trace.rewritten_query}
              isDark={isDark}
            />
            <TraceOutput
              label={`Final Fact Context (${trace.context_chunk_count || 0} chunks passed)`}
              value={trace.context_text}
              empty="No context was passed because candidate chunks did not satisfy relevance thresholds."
              isDark={isDark}
            />
            {trace.reranker_warning && (
              <p className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-amber-400 text-xs">
                {trace.reranker_warning}
              </p>
            )}
            <TraceList
              title="Vector Search Candidates (Cosine Distance)"
              rows={trace.vector_candidates}
              scoreLabel="similarity"
              isDark={isDark}
            />
            <TraceList
              title={
                trace.used_reranker
                  ? "CrossEncoder Reranked Chunks"
                  : "Selected Chunks (Vector Fallback)"
              }
              rows={trace.reranked_chunks}
              scoreLabel="score"
              isDark={isDark}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function TraceOutput({ label, value, empty = "No value returned.", isDark }) {
  return (
    <details
      className={`rounded-2xl border p-4 transition-colors ${
        isDark
          ? "border-slate-800 bg-slate-950/60"
          : "border-slate-200 bg-slate-50"
      }`}
      open
    >
      <summary className="cursor-pointer font-bold text-xs uppercase tracking-wider text-indigo-400">
        {label}
      </summary>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed opacity-90">
        {value || empty}
      </pre>
    </details>
  );
}

function TraceList({ title, rows = [], scoreLabel, isDark }) {
  return (
    <div className="pt-2">
      <b className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </b>
      {rows.length ? (
        <div className="mt-2.5 space-y-2">
          {rows.map((row) => (
            <details
              key={row.chunk_id}
              className={`rounded-xl border p-3 text-xs ${
                isDark
                  ? "border-slate-800 bg-slate-950/80"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <summary className="cursor-pointer flex items-center justify-between font-semibold">
                <span>Chunk {row.chunk_index + 1}</span>
                <span className="font-mono text-indigo-400">
                  {scoreLabel}: {row[scoreLabel]}
                </span>
              </summary>
              <p className="mt-2 font-medium text-slate-400">
                {row.document_title} (document #{row.document_id})
              </p>
              <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed opacity-80">
                {row.content || row.preview}
              </p>
            </details>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400 italic">
          No chunks returned for this filter.
        </p>
      )}
    </div>
  );
}
