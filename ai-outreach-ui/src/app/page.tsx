"use client";

import React, { useState, useRef, useEffect } from "react";

const API_BASE = "https://ai-reachout.onrender.com";

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "reports", label: "Reports" },
  { key: "businesses", label: "Businesses" },
  { key: "persons", label: "Persons" },
  { key: "info", label: "Info" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Welcome to AI Outreach Terminal!" },
    { sender: "user", text: "Hello!" },
    { sender: "ai", text: "How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Businesses
  const [businesses, setBusinesses] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);

  // Persons
  const [persons, setPersons] = useState<Record<string, unknown>[]>([]);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch businesses
  useEffect(() => {
    if (activeTab === "businesses") {
      setBizLoading(true);
      setBizError(null);
      fetch(`${API_BASE}/prospects`)
        .then(res => res.json())
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
        .then(res => res.json())
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
        .then(res => res.json())
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
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      setMessages(msgs => [...msgs, { sender: "ai", text: data.reply }]);
    } catch {
      setMessages(msgs => [...msgs, { sender: "ai", text: "[Error: Failed to get reply]" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter(biz =>
    biz.name?.toLowerCase().includes(search.toLowerCase()) ||
    biz.email?.toLowerCase().includes(search.toLowerCase()) ||
    biz.phone?.includes(search) ||
    biz.social?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPersons = persons.filter(person =>
    person.name?.toLowerCase().includes(personSearch.toLowerCase()) ||
    person.email?.toLowerCase().includes(personSearch.toLowerCase()) ||
    person.phone?.includes(personSearch) ||
    person.social?.toLowerCase().includes(personSearch.toLowerCase())
  );

  const handleSelect = (name: string) => {
    setSelected(sel => sel.includes(name) ? sel.filter(n => n !== name) : [...sel, name]);
  };
  const handlePersonSelect = (name: string) => {
    setPersonSelected(sel => sel.includes(name) ? sel.filter(n => n !== name) : [...sel, name]);
  };

  return (
    <main className="terminal-bg min-h-screen flex flex-col items-center justify-center">
      <div className="terminal-window" style={{ paddingBottom: 64 }}>
        <header className="terminal-header">AI Outreach Terminal</header>
        <div className="terminal-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeTab === "chat" && (
            <>
              <div className="terminal-chat" id="chat-area">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`terminal-msg ${msg.sender === "user" ? "user-msg" : "ai-msg"}`}
                  >
                    <span className="sender">{msg.sender === "user" ? ">" : "AI:"}</span> {msg.text}
                  </div>
                ))}
                {chatLoading && <div className="terminal-msg ai-msg">AI is typing...</div>}
                <div ref={chatEndRef} />
              </div>
              <form className="terminal-input-area" onSubmit={handleSend} autoComplete="off">
                <span className="prompt">$</span>
                <input
                  className="terminal-input"
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message..."
                  autoFocus
                  disabled={chatLoading}
                />
              </form>
            </>
          )}
          {activeTab === "reports" && (
            <div className="terminal-chat" style={{ flex: 1 }}>
              {reportsLoading && <div className="terminal-msg ai-msg">Loading reports...</div>}
              {reportsError && <div className="terminal-msg ai-msg">{reportsError}</div>}
              {!reportsLoading && !reportsError && reports.length === 0 && (
                <div className="terminal-msg ai-msg">No reports found.</div>
              )}
              {!reportsLoading && !reportsError && reports.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.1em' }}>
                  <thead>
                    <tr style={{ color: '#4f46e5', borderBottom: '1px solid #4f46e5' }}>
                      {Object.keys(reports[0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #23234a' }}>
                        {Object.values(row).map((val, j) => (
                          <td key={j}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === "businesses" && (
            <div className="terminal-chat" style={{ flex: 1 }}>
              {bizLoading && <div className="terminal-msg ai-msg">Loading businesses...</div>}
              {bizError && <div className="terminal-msg ai-msg">{bizError}</div>}
              <div style={{ marginBottom: 16 }}>
                <input
                  className="terminal-input"
                  style={{ width: '100%' }}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search businesses..."
                  disabled={bizLoading}
                />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.1em' }}>
                <thead>
                  <tr style={{ color: '#4f46e5', borderBottom: '1px solid #4f46e5' }}>
                    <th></th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Social</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBusinesses.map(biz => (
                    <tr key={biz.email || biz.name} style={{ borderBottom: '1px solid #23234a' }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(biz.name)}
                          onChange={() => handleSelect(biz.name)}
                          disabled={bizLoading}
                        />
                      </td>
                      <td>{biz.name}</td>
                      <td>{biz.email}</td>
                      <td>{biz.phone}</td>
                      <td>{biz.social}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button className="terminal-btn" disabled={selected.length === 0 || bizLoading}>Mail</button>
                <button className="terminal-btn" disabled={selected.length === 0 || bizLoading}>Call</button>
                <button className="terminal-btn" disabled={selected.length === 0 || bizLoading}>Chat on Social</button>
              </div>
            </div>
          )}
          {activeTab === "persons" && (
            <div className="terminal-chat" style={{ flex: 1 }}>
              {personLoading && <div className="terminal-msg ai-msg">Loading persons...</div>}
              {personError && <div className="terminal-msg ai-msg">{personError}</div>}
              <div style={{ marginBottom: 16 }}>
                <input
                  className="terminal-input"
                  style={{ width: '100%' }}
                  type="text"
                  value={personSearch}
                  onChange={e => setPersonSearch(e.target.value)}
                  placeholder="Search persons..."
                  disabled={personLoading}
                />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.1em' }}>
                <thead>
                  <tr style={{ color: '#4f46e5', borderBottom: '1px solid #4f46e5' }}>
                    <th></th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Social</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map(person => (
                    <tr key={person.email || person.name} style={{ borderBottom: '1px solid #23234a ' }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={personSelected.includes(person.name)}
                          onChange={() => handlePersonSelect(person.name)}
                          disabled={personLoading}
                        />
                      </td>
                      <td>{person.name}</td>
                      <td>{person.email}</td>
                      <td>{person.phone}</td>
                      <td>{person.social}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button className="terminal-btn" disabled={personSelected.length === 0 || personLoading}>Mail</button>
                <button className="terminal-btn" disabled={personSelected.length === 0 || personLoading}>Call</button>
                <button className="terminal-btn" disabled={personSelected.length === 0 || personLoading}>Chat on Social</button>
              </div>
            </div>
          )}
          {activeTab === "info" && (
            <div className="terminal-chat" style={{ flex: 1 }}>
              <div className="terminal-msg ai-msg">
                <strong>About this AI Terminal</strong>
                <br /><br />
                This model is designed <u>only</u> for finding businesses and information about prospects/enterprises in different locations.<br /><br />
                <strong>Limitations:</strong>
                <ul style={{ margin: '0.5em 0 0 1.5em', padding: 0 }}>
                  <li>Cannot provide personal advice or unrelated information.</li>
                  <li>Does not handle sensitive or private data.</li>
                  <li>All actions are limited to business discovery and outreach.</li>
                  <li>For best results, provide clear business-related queries.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <nav className="terminal-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`terminal-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
