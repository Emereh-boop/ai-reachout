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
  Link2Off,
} from "lucide-react";
import logo from '../../public/beam-no-bg.png'
import Image from 'next/image';

// Set API_BASE from env or default to local backend
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3002";

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "reports", label: "Reports" },
  { key: "businesses", label: "Businesses" },
  { key: "persons", label: "Persons" },
  { key: "info", label: "Info" },
];

type ContactRecord = {
  name?: string;
  email?: string;
  phone?: string;
  social?: string;
  reachedOut?: string;
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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);

  // Persons
  const [persons, setPersons] = useState<ContactRecord[]>([]);
  const [personSearch, setPersonSearch] = useState("");
  const [personSelected, setPersonSelected] = useState<string[]>([]);
  const [personLoading, setPersonLoading] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);

  // Reports
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch businesses
  useEffect(() => {
    if (activeTab === "businesses") {
      setBizLoading(true);
      setBizError(null);
      fetch(`${API_BASE}/prospects`)
        .then((res) => res.json())
        .then(setBusinesses)
        .catch(() => setBizError("Failed to load businesses"))
        .finally(() => setBizLoading(false));
    }
  }, [activeTab]);

  // Fetch persons
  useEffect(() => {
    if (activeTab === "persons") {
      setPersonLoading(true);
      setPersonError(null);
      fetch(`${API_BASE}/persons`)
        .then((res) => res.json())
        .then(setPersons)
        .catch(() => setPersonError("Failed to load persons"))
        .finally(() => setPersonLoading(false));
    }
  }, [activeTab]);

  // Fetch reports
  useEffect(() => {
    if (activeTab === "reports") {
      setReportsLoading(true);
      setReportsError(null);
      fetch(`${API_BASE}/results`)
        .then((res) => res.json())
        .then(setReports)
        .catch(() => setReportsError("Failed to load reports"))
        .finally(() => setReportsLoading(false));
    }
  }, [activeTab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { sender: "user", text: input }]);
    setInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { sender: "ai", text: data.reply }]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { sender: "ai", text: "[Error: Failed to get reply]" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter(
    (biz) =>
      biz.name?.toLowerCase().includes(search.toLowerCase()) ||
      biz.email?.toLowerCase().includes(search.toLowerCase()) ||
      biz.phone?.includes(search) ||
      biz.social?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPersons = persons.filter(
    (person) =>
      person.name?.toLowerCase().includes(personSearch.toLowerCase()) ||
      person.email?.toLowerCase().includes(personSearch.toLowerCase()) ||
      person.phone?.includes(personSearch) ||
      person.social?.toLowerCase().includes(personSearch.toLowerCase())
  );

  const handleSelect = (name: string) => {
    setSelected((sel) =>
      sel.includes(name) ? sel.filter((n) => n !== name) : [...sel, name]
    );
  };
  const handlePersonSelect = (name: string) => {
    setPersonSelected((sel) =>
      sel.includes(name) ? sel.filter((n) => n !== name) : [...sel, name]
    );
  };

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
    setActiveTab("businesses");
  };
  // Delete selected persons
  const handleDeletePerson = async () => {
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
    setActiveTab("persons");
  };
  // Update reachedOut status for businesses
  const handleUpdateBiz = async (name: string, reachedOut: boolean) => {
    const biz = businesses.find((b) => b.name === name) || {};
    if (biz.email) {
      await fetch(`${API_BASE}/prospects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: biz.email, reachedOut }),
      });
      setActiveTab("businesses");
    }
  };
  // Update reachedOut status for persons
  const handleUpdatePerson = async (name: string, reachedOut: boolean) => {
    const person = persons.find((p) => p.name === name) || {};
    if (person.email) {
      await fetch(`${API_BASE}/persons`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: person.email, reachedOut }),
      });
      setActiveTab("persons");
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
      alert("Upload failed. Please try again.");
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
      
      <div className="terminal-window" style={{ paddingBottom: 64 }}>
        <header className="terminal-header">AI Outreach Terminal</header>
        <div
          className="terminal-panel"
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          {activeTab === "chat" && (
            <>
              <div className="terminal-chat" id="chat-area" style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`chat-bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble"}`}
                  >
                    {msg.text}
                  </div>
                ))}
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
                <div className="terminal-msg ai-msg">No reports found.</div>
              )}
              {!reportsLoading && !reportsError && reports.length > 0 && (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.8em",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "#4f46e5",
                        borderBottom: "1px solid #4f46e5",
                      }}
                    >
                      {Object.keys(reports[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #23234a" }}>
                        {Object.values(row).map((val, j) => (
                          <td key={j}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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

              {/* Search with more space */}
              <div style={{ marginBottom: 20 }}>
                <input
                  className="terminal-input"
                  style={{ width: "100%", padding: "12px 16px" }}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search businesses..."
                  disabled={bizLoading}
                />
              </div>

              {/* Table with smaller font - scrollable */}
              <div style={{ flex: 1, overflow: "auto", marginBottom: 20, maxHeight: "400px" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.8em",
                  }}
                >
                <thead>
                  <tr
                    style={{
                      color: "#4f46e5",
                      borderBottom: "1px solid #4f46e5",
                    }}
                  >
                    <th style={{ padding: "12px 8px" }}></th>
                    <th style={{ padding: "12px 8px" }}>Name</th>
                    <th style={{ padding: "12px 8px" }}>Email</th>
                    <th style={{ padding: "12px 8px" }}>Phone</th>
                    <th style={{ padding: "12px 8px" }}>Social</th>
                    <th style={{ padding: "12px 8px" }}>Connected</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.map((biz) => {
                    const b = biz as ContactRecord;
                    return (
                      <tr
                        key={b.email || b.name}
                        style={{ borderBottom: "1px solid #23234a" }}
                      >
                        <td style={{ padding: "8px" }}>
                          <input
                            type="checkbox"
                            checked={selected.includes(b.name || "")}
                            onChange={() => handleSelect(b.name || "")}
                            disabled={bizLoading}
                          />
                        </td>
                        <td style={{ padding: "8px" }}>{b.name}</td>
                        <td style={{ padding: "8px" }}>{b.email}</td>
                        <td style={{ padding: "8px" }}>{b.phone}</td>
                        <td style={{ padding: "8px" }}>{b.social}</td>
                        <td style={{ padding: "8px" }}>
                          <button
                            className="terminal-btn"
                            type="button"
                            onClick={() =>
                              handleUpdateBiz(
                                b.name || "",
                                !(b.reachedOut === "true")
                              )
                            }
                          >
                            {b.reachedOut === "true" ? (
                              <>
                                <Link2 size={16} style={{ color: "#10b981" }} />
                              </>
                            ) : (
                              <>
                                <Link2Off
                                  size={16}
                                  style={{ color: "#ef4444" }}
                                />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  gap: 8,
                  flexWrap: "nowrap",
                }}
              >
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.8rem",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  disabled={selected.length === 0 || bizLoading}
                  onClick={async () => {
                    if (selected.length > 0) {
                      await fetch(`${API_BASE}/outreach`, { method: "POST" });
                      alert("Outreach (email) triggered for all businesses.");
                    }
                  }}
                >
                  <Mail size={20} />{" "}
                </button>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.8rem",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  disabled={selected.length === 0 || bizLoading}
                  onClick={() => {
                    const phones = selected
                      .map((n) => {
                        const b = businesses.find((bz) => bz.name === n) || {};
                        return b.phone;
                      })
                      .filter(Boolean);
                    alert("Call these numbers:\n" + phones.join("\n"));
                  }}
                >
                  <Phone size={20} />
                </button>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.8rem",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  disabled={selected.length === 0 || bizLoading}
                  onClick={() => {
                    const socials = selected
                      .map((n) => {
                        const b = businesses.find((bz) => bz.name === n) || {};
                        return b.social;
                      })
                      .filter(Boolean);
                    alert("Chat on social (Instagram):\n" + socials.join("\n"));
                  }}
                >
                  <MessageCircle size={20} />
                </button>
                <button
                  className="terminal-btn"
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                  onClick={handleDeleteBiz}
                  disabled={selected.length === 0 || bizLoading}
                >
                  <Trash2 size={20} /> ({selected.length})
                </button>
                <button
                  className="terminal-btn"
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => setShowAddBizModal(true)}
                >
                  <Plus size={16} /> Add
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
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => bizFileInputRef.current?.click()}
                >
                  <Upload size={16} /> Upload CSV
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

              {/* Search with more space */}
              <div style={{ marginBottom: 20 }}>
                <input
                  className="terminal-input"
                  style={{ width: "100%", padding: "12px 16px" }}
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  placeholder="Search persons..."
                  disabled={personLoading}
                />
              </div>

              {/* Table with smaller font - scrollable */}
              <div style={{ flex: 1, overflow: "auto", marginBottom: 20, maxHeight: "400px" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.8em",
                  }}
                >
                <thead>
                  <tr
                    style={{
                      color: "#4f46e5",
                      borderBottom: "1px solid #4f46e5",
                    }}
                  >
                    <th style={{ padding: "12px 8px" }}></th>
                    <th style={{ padding: "12px 8px" }}>Name</th>
                    <th style={{ padding: "12px 8px" }}>Email</th>
                    <th style={{ padding: "12px 8px" }}>Phone</th>
                    <th style={{ padding: "12px 8px" }}>Social</th>
                    <th style={{ padding: "12px 8px" }}>connected</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((person) => {
                    return (
                      <tr
                        key={person.email || person.name}
                        style={{ borderBottom: "1px solid #23234a" }}
                      >
                        <td style={{ padding: "8px" }}>
                          <input
                            type="checkbox"
                            checked={personSelected.includes(person.name || "")}
                            onChange={() =>
                              handlePersonSelect(person.name || "")
                            }
                            disabled={personLoading}
                          />
                        </td>
                        <td style={{ padding: "8px" }}>{person.name}</td>
                        <td style={{ padding: "8px" }}>{person.email}</td>
                        <td style={{ padding: "8px" }}>{person.phone}</td>
                        <td style={{ padding: "8px" }}>{person.social}</td>
                        <td style={{ padding: "8px" }}>
                          <button
                            className="terminal-btn"
                            type="button"
                            onClick={() =>
                              handleUpdatePerson(
                                person.name || "",
                                !(person.reachedOut === "true")
                              )
                            }
                          >
                            {person.reachedOut === "true" ? (
                              <>
                                <Link2 size={16} style={{ color: "#10b981" }} />
                              </>
                            ) : (
                              <>
                                <Link2Off
                                  size={16}
                                  style={{ color: "#ef4444" }}
                                />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  gap: 8,
                  flexWrap: "nowrap",
                }}
              >
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.8rem",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  disabled={personSelected.length === 0 || personLoading}
                  onClick={async () => {
                    if (personSelected.length > 0) {
                      await fetch(`${API_BASE}/outreach`, { method: "POST" });
                      alert("Outreach (email) triggered for all persons.");
                    }
                  }}
                >
                  <Mail size={20} />{" "}
                </button>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.8rem",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  disabled={personSelected.length === 0 || personLoading}
                  onClick={() => {
                    const phones = personSelected
                      .map((n) => {
                        const p = persons.find((pz) => pz.name === n) || {};
                        return p.phone;
                      })
                      .filter(Boolean);
                    alert("Call these numbers:\n" + phones.join("\n"));
                  }}
                >
                  <Phone size={20} />
                </button>
                <button
                  className="terminal-btn"
                  style={{
                    fontSize: "0.8rem",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  disabled={personSelected.length === 0 || personLoading}
                  onClick={() => {
                    const socials = personSelected
                      .map((n) => {
                        const p = persons.find((pz) => pz.name === n) || {};
                        return p.social;
                      })
                      .filter(Boolean);
                    alert("Chat on social (Instagram):\n" + socials.join("\n"));
                  }}
                >
                  <MessageCircle size={20} />
                </button>
                <button
                  className="terminal-btn"
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                  onClick={handleDeletePerson}
                  disabled={personSelected.length === 0 || personLoading}
                >
                  <Trash2 size={20} /> ({personSelected.length})
                </button>
                <button
                  className="terminal-btn"
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => setShowAddPersonModal(true)}
                >
                  <Plus size={16} /> Add
                </button>
                <input
                  ref={personFileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    handleFileSelect(e.target.files?.[0] || null, "person")
                  }
                />
                <button
                  className="terminal-btn"
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => personFileInputRef.current?.click()}
                >
                  <Upload size={16} /> Upload CSV
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
        <nav className="terminal-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`terminal-tab${
                activeTab === tab.key ? " active" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
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
    </main>
  );
}
