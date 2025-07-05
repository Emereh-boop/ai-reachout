"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mail,
  Phone,
  MessageCircle,
  Plus,
  Upload,
  Trash2,
  Link2,
  Newspaper,
  Building2,
  Users,
  Info,
} from "lucide-react";
import logo from '../../public/beam-dark-no-bg.png'
import Image from 'next/image';

// Set API_BASE from env or default to Render backend
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://ai-reachout.onrender.com";

const TABS = [
  { key: "chat", label: <MessageCircle size={22} />, name: "Chat" },
  { key: "reports", label: <Newspaper size={22} />, name: "News" },
  { key: "businesses", label: <Building2 size={22} />, name: "Enterprise" },
  { key: "persons", label: <Users size={22} />, name: "People" },
  { key: "info", label: <Info size={22} />, name: "About" },
];

type ContactRecord = {
  name?: string;
  email?: string;
  phone?: string;
  social?: string;
  reachedOut?: string;
};

type NewsArticle = {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
};

function SlidingDotsLoader() {
  return (
    <div className="sliding-dots-loader">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([
    { sender: "Beamer", text: "Hey, I'm Beamer. Let's light the way. How can I assist?" }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Businesses
  const [businesses, setBusinesses] = useState<ContactRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);
  const [businessSearch, setBusinessSearch] = useState("");

  // Persons
  const [persons, setPersons] = useState<ContactRecord[]>([]);
  const [personSelected, setPersonSelected] = useState<string[]>([]);
  const [personLoading, setPersonLoading] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);
  const [personSearch, setPersonSearch] = useState("");

  // Reports
  const [reports, setReports] = useState<NewsArticle[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Chat loading
  const [chatLoading, setChatLoading] = useState(false);

  // Add state for new business/person forms and file uploads
  const [newBiz, setNewBiz] = useState({
    name: "",
    email: "",
    phone: "",
    social: "",
  });
  const [newPerson, setNewPerson] = useState({
    name: "",
    email: "",
    phone: "",
    social: "",
  });

  // Modal state
  const [showAddBizModal, setShowAddBizModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);

  // Add refs for hidden file inputs
  const bizFileInputRef = useRef<HTMLInputElement>(null);
  const personFileInputRef = useRef<HTMLInputElement>(null);

  // Add state to track expanded chat bubbles
  const [expandedMsgs, setExpandedMsgs] = useState<{ [key: number]: boolean }>({});

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");

  // Helper function to show custom alerts
  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch businesses
  useEffect(() => {
    if (activeTab === "businesses") {
      setBizLoading(true);
      setBizError(null);
      fetch(`${API_BASE}/prospects`)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          const businessesData = Array.isArray(data) ? data : [];
          setBusinesses(businessesData);
        })
        .catch(() => {
          setBizError("Failed to load businesses");
        })
        .finally(() => setBizLoading(false));
    }
  }, [activeTab]);

  // Fetch persons
  useEffect(() => {
    if (activeTab === "persons") {
      setPersonLoading(true);
      setPersonError(null);
      fetch(`${API_BASE}/persons`)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          const personsData = Array.isArray(data) ? data : [];
          setPersons(personsData);
        })
        .catch(() => {
          setPersonError("Failed to load persons");
        })
        .finally(() => setPersonLoading(false));
    }
  }, [activeTab]);

  // Fetch reports
  useEffect(() => {
    if (activeTab === "reports") {
      setReportsLoading(true);
      setReportsError(null);
      fetch(`${API_BASE}/news`)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          const newsData = Array.isArray(data) ? data : [];
          setReports(newsData);
        })
        .catch(() => {
          setReportsError("Failed to load news");
        })
        .finally(() => setReportsLoading(false));
    }
  }, [activeTab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    const baseHistory = [...messages]; // Don't add userMsg yet
    setInput("");
    setChatLoading(true);

    const maxRetries = 5;
    let attempt = 0;
    let success = false;
    let data: { reply?: string } = {};

    while (attempt < maxRetries && !success) {
      try {
        // Only send the last 9 previous messages plus the new user message
        const trimmedBase = baseHistory.slice(-9); // 9 + 1 = 10
        const chatHistory = [...trimmedBase, userMsg];
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
        });
        data = await res.json();
        if (data && typeof data.reply === 'string' && data.reply.trim() && !data.reply.startsWith("[Error")) {
          setMessages((msgs) => [...msgs, userMsg, { sender: "ai", text: data.reply! }]);
          success = true;
          break;
        }
      } catch (err) {
        console.error('[error]',err);
      }
      attempt++;
      if (!success && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 seconds
      }
    }
    if (!success) {
      setMessages((msgs) => [...msgs, userMsg, { sender: "ai", text: `Failed to get reply after ${maxRetries} attempts` }]);
    }
    setChatLoading(false);
  };

  const filteredBusinesses = businesses.filter(
    (business) =>
      business.name?.toLowerCase().includes(businessSearch.toLowerCase()) ||
      business.email?.toLowerCase().includes(businessSearch.toLowerCase()) ||
      business.phone?.includes(businessSearch) ||
      business.social?.toLowerCase().includes(businessSearch.toLowerCase())
  );

  const filteredPersons = persons.filter(
    (person) =>
      person.name?.toLowerCase().includes(personSearch.toLowerCase()) ||
      person.email?.toLowerCase().includes(personSearch.toLowerCase()) ||
      person.phone?.includes(personSearch) ||
      person.social?.toLowerCase().includes(personSearch.toLowerCase())
  );

  // Add business
  const handleAddBiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBiz.name || !newBiz.email) return;
    // Add to backend (append to CSV not supported, so fetch, add, upload)
    const updated = [...businesses, newBiz];
    const csv = [
      Object.keys(updated[0]).join(","),
      ...updated.map((b) => Object.values(b).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", blob, "prospects.csv");
    await fetch(`${API_BASE}/prospects`, { method: "POST", body: formData });
    setNewBiz({ name: "", email: "", phone: "", social: "" });
    setActiveTab("businesses"); // reload
  };
  // Add person
  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.name || !newPerson.email) return;
    const updated = [...persons, newPerson];
    const csv = [
      Object.keys(updated[0]).join(","),
      ...updated.map((p) => Object.values(p).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", blob, "persons.csv");
    await fetch(`${API_BASE}/persons`, { method: "POST", body: formData });
    setNewPerson({ name: "", email: "", phone: "", social: "" });
    setActiveTab("persons");
  };
  // Delete selected businesses
  const handleDeleteBiz = async () => {
    try {
      for (const name of selected) {
        const biz = businesses.find((b) => b.name === name) || {};
        if (biz.email) {
          await fetch(`${API_BASE}/prospects`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: biz.email }),
          });
        }
      }
      // Clear selection and refresh data
      setSelected([]);
      setBizLoading(true);
      const response = await fetch(`${API_BASE}/prospects`);
      const data = await response.json();
      setBusinesses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error deleting businesses:", error);
      showAlert("Error", "Failed to delete businesses. Please try again.");
    } finally {
      setBizLoading(false);
    }
  };
  
  // Delete selected persons
  const handleDeletePerson = async () => {
    try {
      for (const name of personSelected) {
        const person = persons.find((p) => p.name === name) || {};
        if (person.email) {
          await fetch(`${API_BASE}/persons`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: person.email }),
          });
        }
      }
      // Clear selection and refresh data
      setPersonSelected([]);
      setPersonLoading(true);
      const response = await fetch(`${API_BASE}/persons`);
      const data = await response.json();
      setPersons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error deleting persons:", error);
      showAlert("Error", "Failed to delete persons. Please try again.");
    } finally {
      setPersonLoading(false);
    }
  };

  // Handle file selection and automatic upload
  const handleFileSelect = async (
    file: File | null,
    type: "business" | "person"
  ) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      if (type === "business") {
        await fetch(`${API_BASE}/prospects`, {
          method: "POST",
          body: formData,
        });
        setActiveTab("businesses");
      } else {
        await fetch(`${API_BASE}/persons`, { method: "POST", body: formData });
        setActiveTab("persons");
      }
    } catch {
      showAlert("Error", "Upload failed. Please try again.");
    }
  };

  return (
    <main className="terminal-bg min-h-svh">
      <div style={{width:'150px', height:'150px', position: 'relative'}}>
        <Image 
          src={logo} 
          alt="Logo" 
          fill
          style={{ 
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: '8px'
          }} 
        />
      </div>
      
      <div className="terminal-window" style={{ paddingBottom: 46 }}>
        <header className="terminal-header" style={{ padding: "9px 6px", fontSize: "1.5rem" }}>AI Outreach Terminal</header>
        <div
          className="terminal-panel"
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          {activeTab === "chat" && (
            <>
              <div className="terminal-chat" id="chat-area" style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.map((msg, idx) => {
                  const isExpanded = expandedMsgs[idx];
                  const shouldShowToggle = msg.text.length > 200;
                  return (
                    <div
                      key={idx}
                      className={`chat-bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble"}`}
                      style={{
                        position: "relative",
                        padding: "12px"
                      }}
                    >
                      <div
                        style={{
                          maxHeight: isExpanded ? "none" : "120px",
                          overflow: isExpanded ? "visible" : "hidden",
                          overflowWrap: "break-word",
                          whiteSpace: "pre-line",
                          lineHeight: "1.4",
                          position: "relative"
                        }}
                      >
                        {msg.text}
                        {!isExpanded && shouldShowToggle && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: "40px",
                              background: msg.sender === "user" 
                                ? "linear-gradient(180deg, transparent 0%, #008069 100%)"
                                : "linear-gradient(180deg, transparent 0%, #23234a 100%)",
                              pointerEvents: "none"
                            }}
                          />
                        )}
                      </div>
                      {shouldShowToggle && (
                        <div
                          style={{
                            textAlign: "center",
                            marginTop: "4px"
                          }}
                        >
                          <button
                            onClick={() => setExpandedMsgs((prev) => ({ ...prev, [idx]: !isExpanded }))}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#008069",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 128, 105, 0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            {isExpanded ? "See less" : "See more"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {chatLoading && (
                  <div className="terminal-msg ai-msg">
                    <SlidingDotsLoader />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form
                className="terminal-input-area"
                onSubmit={handleSend}
                autoComplete="off"
              >
                <span className="prompt">$</span>
                <input
                  className="terminal-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  autoFocus
                  disabled={chatLoading}
                />
              </form>
            </>
          )}
          {activeTab === "reports" && (
            <div className="terminal-chat" style={{ flex: 1 }}>
              {reportsLoading && (
                <div className="terminal-msg ai-msg">
                  <SlidingDotsLoader />
                </div>
              )}
              {reportsError && (
                <div className="terminal-msg ai-msg">{reportsError}</div>
              )}
              {!reportsLoading && !reportsError && reports.length === 0 && (
                <div className="terminal-msg ai-msg">No news found.</div>
              )}
              {!reportsLoading && !reportsError && reports.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {reports.map((article: NewsArticle, i) => (
                    <div
                      key={i}
                      style={{
                        border: "1px solid #008069",
                        borderRadius: "8px",
                        padding: "12px",
                        background: "rgba(0, 128, 105, 0.05)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onClick={() => window.open(article.url, '_blank')}
                    >
                      <h3 style={{ 
                        margin: "0 0 8px 0", 
                        color: "#008069",
                        fontSize: "1em",
                        fontWeight: "600"
                      }}>
                        {article.title}
                      </h3>
                      <p style={{ 
                        margin: "0 0 12px 0", 
                        color: "#e9edef",
                        fontSize: "0.8em",
                        lineHeight: "1.2"
                      }}>
                        {article.description}
                      </p>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.8em",
                        color: "#667781"
                      }}>
                        <span>📰 {article.source}</span>
                        <span>📅 {new Date(article.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "businesses" && (
            <div className="terminal-chat" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {bizLoading && (
                <div className="terminal-msg ai-msg">
                  <SlidingDotsLoader />
                </div>
              )}
              {bizError && (
                <div className="terminal-msg ai-msg">{bizError}</div>
              )}

              {/* WhatsApp-style header with search icon */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "8px 10px",
                borderBottom: "1px solid #2a3942",
                gap: "8px",
                background: "#202c33",
                minHeight: 36
              }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "50%", 
                  background: "#008069",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <Building2 size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e9edef", fontWeight: "600", fontSize: "13px" }}>
                    Enterprise Contacts
                  </div>
                  <div style={{ color: "#667781", fontSize: "11px" }}>
                    {filteredBusinesses.length} businesses
                  </div>
                </div>
                <input
                  className="terminal-input"
                  style={{ 
                    width: "120px", 
                    padding: "4px 8px", 
                    fontSize: "11px",
                    background: "#2a3942",
                    border: "1px solid #008069",
                    borderRadius: "4px",
                    color: "#e9edef"
                  }}
                  type="text"
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  placeholder="Search businesses..."
                  disabled={bizLoading}
                />
                <button
                  className="terminal-btn"
                  style={{
                    padding: "4px",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onClick={() => setShowAddBizModal(true)}
                  title="Add Business"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* WhatsApp-style chat list */}
              <div style={{ flex: 1, overflow: "auto" }}>
                {filteredBusinesses.map((biz) => {
                  const b = biz as ContactRecord;
                  return (
                    <div
                      key={b.email || b.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 10px",
                        borderBottom: "1px solid #2a3942",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#202c33"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ 
                        width: "36px", 
                        height: "36px", 
                        borderRadius: "50%", 
                        background: "#008069",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "14px",
                        marginRight: "8px"
                      }}>
                        <Building2 size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#e9edef", fontWeight: "500", fontSize: "13px" }}>
                          {b.name}
                        </div>
                        <div style={{ color: "#667781", fontSize: "12px" }}>
                          {b.email}
                        </div>
                        {b.phone && (
                          <div style={{ color: "#667781", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Phone size={10} />
                            {b.phone}
                          </div>
                        )}
                      </div>
                      <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center",
                        gap: "2px"
                      }}>
                        {b.reachedOut === "true" ? (
                          <div style={{ color: "#008069", fontSize: "10px", display: "flex", alignItems: "center", gap: "2px" }}>
                            <Link2 size={10} />
                            Contacted
                          </div>
                        ) : (
                          <div style={{ color: "#667781", fontSize: "10px" }}>New</div>
                        )}
                        <button
                          className="terminal-btn"
                          style={{
                            padding: "2px 6px",
                            fontSize: "10px",
                            borderRadius: "10px",
                            background: "#008069",
                            color: "white",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px"
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (b.email) {
                              fetch(`${API_BASE}/outreach`, { 
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email: b.email })
                              });
                              showAlert("Success", `AI outreach triggered for ${b.name}`);
                            }
                          }}
                        >
                          <Mail size={10} />
                          Email
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div style={{
                padding: "8px 10px",
                borderTop: "1px solid #2a3942",
                display: "flex",
                gap: "6px",
                justifyContent: "space-between"
              }}>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#008069",
                    color: "white",
                    border: "none",
                    borderRadius: "6px"
                  }}
                  disabled={selected.length === 0 || bizLoading}
                  onClick={async () => {
                    if (selected.length > 0) {
                      await fetch(`${API_BASE}/outreach`, { method: "POST" });
                      showAlert("Success", "Outreach (email) triggered for all businesses.");
                    }
                  }}
                >
                  <Mail size={12} /> Bulk Email
                </button>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#f15c6d",
                    color: "white",
                    border: "none",
                    borderRadius: "6px"
                  }}
                  onClick={handleDeleteBiz}
                  disabled={selected.length === 0 || bizLoading}
                >
                  <Trash2 size={12} /> Delete ({selected.length})
                </button>
                <input
                  ref={bizFileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleFileSelect(e.target.files?.[0] || null, "business")
                  }
                />
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#667781",
                    color: "white",
                    border: "none",
                    borderRadius: "6px"
                  }}
                  onClick={() => bizFileInputRef.current?.click()}
                >
                  <Upload size={12} /> Import
                </button>
              </div>
            </div>
          )}
          {activeTab === "persons" && (
            <div className="terminal-chat" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {personLoading && (
                <div className="terminal-msg ai-msg">
                  <SlidingDotsLoader />
                </div>
              )}
              {personError && (
                <div className="terminal-msg ai-msg">{personError}</div>
              )}

              {/* WhatsApp-style header with search icon */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "8px 10px",
                borderBottom: "1px solid #2a3942",
                gap: "8px",
                background: "#202c33",
                minHeight: 36
              }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "50%", 
                  background: "#008069",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <Users size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e9edef", fontWeight: "600", fontSize: "13px" }}>
                    People Contacts
                  </div>
                  <div style={{ color: "#667781", fontSize: "11px" }}>
                    {filteredPersons.length} people
                  </div>
                </div>
                <input
                  className="terminal-input"
                  style={{ 
                    width: "120px", 
                    padding: "4px 8px", 
                    fontSize: "11px",
                    background: "#2a3942",
                    border: "1px solid #008069",
                    borderRadius: "4px",
                    color: "#e9edef"
                  }}
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  placeholder="Search people..."
                  disabled={personLoading}
                />
                <button
                  className="terminal-btn"
                  style={{
                    padding: "4px",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onClick={() => setShowAddPersonModal(true)}
                  title="Add Person"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* WhatsApp-style chat list for persons */}
              <div style={{ flex: 1, overflow: "auto" }}>
                {filteredPersons.map((p) => (
                  <div
                    key={p.email || p.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderBottom: "1px solid #2a3942",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#202c33"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ 
                      width: "36px", 
                      height: "36px", 
                      borderRadius: "50%", 
                      background: "#008069",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "14px",
                      marginRight: "8px"
                    }}>
                      <Users size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#e9edef", fontWeight: 500, fontSize: "13px" }}>
                        {p.name}
                      </div>
                      <div style={{ color: "#667781", fontSize: "12px" }}>
                        {p.email}
                      </div>
                      {p.phone && (
                        <div style={{ color: "#667781", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Phone size={10} />
                          {p.phone}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                      {p.reachedOut === "true" ? (
                        <div style={{ color: "#008069", fontSize: "10px", display: "flex", alignItems: "center", gap: "2px" }}>
                          <Link2 size={10} /> Contacted
                        </div>
                      ) : (
                        <div style={{ color: "#667781", fontSize: "10px" }}>New</div>
                      )}
                      <button
                        className="terminal-btn"
                        style={{
                          padding: "2px 6px",
                          fontSize: "10px",
                          borderRadius: "10px",
                          background: "#008069",
                          color: "white",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px"
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          if (p.email) {
                            fetch(`${API_BASE}/outreach`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: p.email })
                            });
                            showAlert("Success", `AI outreach triggered for ${p.name}`);
                          }
                        }}
                      >
                        <Mail size={10} /> Email
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{
                padding: "8px 10px",
                borderTop: "1px solid #2a3942",
                display: "flex",
                gap: "6px",
                justifyContent: "space-between"
              }}>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#008069",
                    color: "white",
                    border: "none",
                    borderRadius: "6px"
                  }}
                  disabled={personSelected.length === 0 || personLoading}
                  onClick={async () => {
                    if (personSelected.length > 0) {
                      await fetch(`${API_BASE}/outreach`, { method: "POST" });
                      showAlert("Success", "Outreach (email) triggered for all persons.");
                    }
                  }}
                >
                  <Mail size={12} /> Bulk Email
                </button>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#f15c6d",
                    color: "white",
                    border: "none",
                    borderRadius: "6px"
                  }}
                  onClick={handleDeletePerson}
                  disabled={personSelected.length === 0 || personLoading}
                >
                  <Trash2 size={12} /> Delete ({personSelected.length})
                </button>
                <input
                  ref={personFileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={e =>
                    handleFileSelect(e.target.files?.[0] || null, "person")
                  }
                />
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#667781",
                    color: "white",
                    border: "none",
                    borderRadius: "6px"
                  }}
                  onClick={() => personFileInputRef.current?.click()}
                >
                  <Upload size={12} /> Import
                </button>
              </div>
            </div>
          )}
          {activeTab === "info" && (
            <div className="terminal-chat" style={{ flex: 1 }}>
              <div className="terminal-msg ai-msg">
                <strong>About this AI Terminal</strong>
                <br />
                <br />
                NOTE: This model is designed <u>only</u> for finding businesses
                and information about prospects/enterprises in different
                locations.
                <br />
                <br />
                <strong>Limitations:</strong>
                <ul style={{ margin: "0.5em 0 0 1.5em", padding: 0 }}>
                  <li>
                    Cannot provide personal advice or unrelated information.
                  </li>
                  <li>Does not handle sensitive or private data.</li>
                  <li>
                    All actions are limited to business discovery and outreach.
                  </li>
                  <li>
                    For best results, provide clear business-related queries.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <nav className="terminal-tabs" style={{ padding: "6px 0", minHeight: "36px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`terminal-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
              title={tab.name}
              style={{ padding: "3px 7px", fontSize: "17px" }}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Add Business Modal */}
      {showAddBizModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddBizModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20, color: "#b3baff" }}>
              Add New Business
            </h3>
            <form
              onSubmit={handleAddBiz}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <input
                className="terminal-input"
                type="text"
                placeholder="Business Name"
                value={newBiz.name}
                onChange={(e) => setNewBiz({ ...newBiz, name: e.target.value })}
                required
              />
              <input
                className="terminal-input"
                type="email"
                placeholder="Email"
                value={newBiz.email}
                onChange={(e) =>
                  setNewBiz({ ...newBiz, email: e.target.value })
                }
                required
              />
              <input
                className="terminal-input"
                type="text"
                placeholder="Phone"
                value={newBiz.phone}
                onChange={(e) =>
                  setNewBiz({ ...newBiz, phone: e.target.value })
                }
              />
              <input
                className="terminal-input"
                type="text"
                placeholder="Social Handle"
                value={newBiz.social}
                onChange={(e) =>
                  setNewBiz({ ...newBiz, social: e.target.value })
                }
              />
              <div
                style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
              >
                <button
                  className="terminal-btn"
                  type="button"
                  onClick={() => setShowAddBizModal(false)}
                >
                  Cancel
                </button>
                <button className="terminal-btn" type="submit">
                  Add Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAddPersonModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddPersonModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Person</h3>
            <form
              onSubmit={handleAddPerson}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <input
                className="terminal-input"
                type="text"
                placeholder="Full Name"
                value={newPerson.name}
                onChange={(e) =>
                  setNewPerson({ ...newPerson, name: e.target.value })
                }
                required
              />
              <input
                className="terminal-input"
                type="email"
                placeholder="Email"
                value={newPerson.email}
                onChange={(e) =>
                  setNewPerson({ ...newPerson, email: e.target.value })
                }
                required
              />
              <input
                className="terminal-input"
                type="text"
                placeholder="Phone"
                value={newPerson.phone}
                onChange={(e) =>
                  setNewPerson({ ...newPerson, phone: e.target.value })
                }
              />
              <input
                className="terminal-input"
                type="text"
                placeholder="Social Handle"
                value={newPerson.social}
                onChange={(e) =>
                  setNewPerson({ ...newPerson, social: e.target.value })
                }
              />
              <div
                style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
              >
                <button
                  className="terminal-btn"
                  type="button"
                  onClick={() => setShowAddPersonModal(false)}
                >
                  Cancel
                </button>
                <button className="terminal-btn" type="submit">
                  Add Person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAlertModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ 
              marginBottom: 20, 
              color: alertTitle === "Error" ? "#ef4444" : "#10b981",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              {alertTitle === "Error" ? "❌" : "✅"} {alertTitle}
            </h3>
            <p style={{ 
              marginBottom: 20, 
              color: "#e9edef",
              lineHeight: "1.5"
            }}>
              {alertMessage}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="terminal-btn"
                onClick={() => setShowAlertModal(false)}
                style={{
                  background: alertTitle === "Error" ? "#ef4444" : "#10b981",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px"
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
