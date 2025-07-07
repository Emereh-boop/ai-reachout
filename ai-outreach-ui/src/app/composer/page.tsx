"use client";
import React, { useState, useEffect } from "react";
import { Bold, Italic, Underline } from "lucide-react";

interface Business {
  name: string;
  email?: string;
  company?: string;
  category?: string;
  website?: string;
}

const tones = ["Friendly", "Bold", "Humble"];

export default function ComposerPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business[]>([]);
  const [tone, setTone] = useState("Friendly");
  const [template, setTemplate] = useState("Hi {{name}},\n\nI love what {{company}} is doing in the {{category}} space! Let's connect.\n");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    fetchBusinesses();
    // Simulate checking for Gmail connection (in production, check user session or DB)
    setGmailConnected(!!localStorage.getItem("gmailTokens"));
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://ai-reachout.onrender.com/search-businesses?limit=50");
      const data = await res.json();
      if (data.status === "success") {
        setBusinesses(data.results);
      } else {
        setError("Failed to fetch businesses");
      }
    } catch (err) {
      setError("Error fetching businesses");
      console.error(err);
    }
    setLoading(false);
  };

  const handleBusinessSelect = (business: Business) => {
    if (selected.find(b => b.email === business.email)) {
      setSelected(selected.filter(b => b.email !== business.email));
    } else {
      setSelected([...selected, business]);
    }
  };

  const handleSendOutreach = async () => {
    if (selected.length === 0) {
      setError("Please select at least one business");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const businessIds = selected.map(b => b.email || b.name);
      const res = await fetch("https://ai-reachout.onrender.com/bulk-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          businessIds, 
          messageType: "email", 
          customMessage: template 
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSelected([]);
        setTemplate("Hi {{name}},\n\nI love what {{company}} is doing in the {{category}} space! Let's connect.\n");
      } else {
        setError("Failed to send outreach");
      }
    } catch (err) {
      setError("Error sending outreach");
      console.error(err);
    }
    setSending(false);
  };

  const preview = (p: Business) => template
    .replace(/{{name}}/g, p.name)
    .replace(/{{company}}/g, p.company || p.name)
    .replace(/{{category}}/g, p.category || "business");

  // Formatting helpers
  const formatSelection = (type: "bold" | "italic" | "underline") => {
    const textarea = document.getElementById("template-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = template.slice(0, start);
    const selected = template.slice(start, end);
    const after = template.slice(end);
    let formatted = selected;
    if (type === "bold") formatted = `**${selected || "bold text"}**`;
    if (type === "italic") formatted = `_${selected || "italic text"}_`;
    if (type === "underline") formatted = `<u>${selected || "underlined text"}</u>`;
    const newValue = before + formatted + after;
    setTemplate(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(before.length, before.length + formatted.length);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-[#FFE6A7] flex flex-col items-center py-8">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {!gmailConnected && (
          <div className="bg-white rounded-xl p-4 shadow flex flex-col items-center mb-4">
            <span className="text-[#2D2A32] font-semibold mb-2">Connect your Gmail to send outreach</span>
            <a href="https://ai-reachout.onrender.com/auth/google">
              <button className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm">Connect Gmail</button>
            </a>
          </div>
        )}
        <div className="flex gap-4">
          {/* Left: Available Businesses */}
          <div className="w-48 bg-[#FFF6DC] rounded-xl p-4 shadow h-fit">
            <div className="font-bold mb-2">Available Businesses</div>
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <ul className="text-sm space-y-2">
                {businesses.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.some(s => s.email === b.email)}
                      onChange={() => handleBusinessSelect(b)}
                      className="rounded"
                    />
                    <div>
                      <div className="font-semibold text-[#2D2A32]">{b.name}</div>
                      <div className="text-xs text-gray-500">{b.category}</div>
                    </div>
                </li>
              ))}
            </ul>
            )}
          </div>
          {/* Center: Email Template Editor */}
          <div className="flex-1 bg-[#FFF6DC] rounded-2xl p-6 shadow flex flex-col gap-4">
            <div className="flex gap-2 mb-2">
              {tones.map(t => (
                <button key={t} onClick={() => setTone(t)} className={`px-4 py-2 rounded-full font-semibold ${tone === t ? 'bg-[#f0cfcf] text-[#2D2A32]' : 'bg-[#ffed82] text-[#2D2A32]'} transition`}>{t}</button>
              ))}
            </div>
            {/* Formatting icon buttons */}
            <div className="flex gap-2 mb-2">
              <button type="button" title="Bold" onClick={() => formatSelection("bold")}
                className="p-2 rounded hover:bg-[#FFD1DC] transition border border-gray-200">
                <Bold size={18} />
              </button>
              <button type="button" title="Italic" onClick={() => formatSelection("italic")}
                className="p-2 rounded hover:bg-[#FFD1DC] transition border border-gray-200">
                <Italic size={18} />
              </button>
              <button type="button" title="Underline" onClick={() => formatSelection("underline")}
                className="p-2 rounded hover:bg-[#FFD1DC] transition border border-gray-200">
                <Underline size={18} />
              </button>
            </div>
            <textarea id="template-textarea" value={template} onChange={e => setTemplate(e.target.value)} className="w-full h-40 rounded-lg border-none bg-[#fff6dc] p-4 text-lg focus:ring-2 focus:ring-[#f0cfcf]" />
          </div>
          {/* Right: Live Preview */}
          <div className="w-80 bg-[#FFF6DC] rounded-xl p-4 shadow h-fit">
            <div className="font-bold mb-2">Live Preview</div>
            <div className="space-y-4">
              {selected.map((p, i) => (
                <div key={i} className="bg-[#FFF6DC] rounded-lg p-3 shadow text-sm">
                  <div className="font-semibold text-[#2D2A32] mb-1">To: {p.name} ({p.email || 'No email'})</div>
                  <pre className="whitespace-pre-wrap text-[#2D2A32]">{preview(p)}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Bottom: Action Buttons */}
        <div className="flex gap-4 justify-end mt-4">
          <button className="bg-[#ffed82] hover:bg-[#f0cfcf] text-[#2D2A32] font-semibold py-2 px-6 rounded-full transition">Schedule Outreach</button>
          <button onClick={handleSendOutreach} disabled={sending || selected.length === 0 || !gmailConnected} className="bg-[#f0cfcf] hover:bg-[#ffed82] text-[#2D2A32] font-semibold py-2 px-6 rounded-full transition">
            {sending ? "Sending..." : "Send Outreach"}
          </button>
        </div>
        {error && <div className="text-red-500 text-center">{error}</div>}
      </div>
    </div>
  );
} 