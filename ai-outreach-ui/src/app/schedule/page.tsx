"use client";
import React, { useEffect, useState } from "react";

interface OutreachResult {
  email: string;
  status: string;
  timestamp?: string;
  subject?: string;
  error?: string;
}

export default function SchedulePage() {
  const [results, setResults] = useState<OutreachResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOutreach, setNewOutreach] = useState({ email: "", subject: "", timestamp: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://ai-reachout.onrender.com/results");
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error fetching outreach results");
      setResults([]);
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FFE6A7] flex flex-col items-center py-8">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <h1 className="text-3xl font-bold mb-4 text-[#2D2A32]">Schedule Dashboard</h1>
        {/* Add Schedule Form */}
        <form
          onSubmit={async e => {
            e.preventDefault();
            setAdding(true);
            setResults([
              ...results,
              {
                email: newOutreach.email,
                subject: newOutreach.subject,
                timestamp: newOutreach.timestamp,
                status: "scheduled",
              },
            ]);
            setNewOutreach({ email: "", subject: "", timestamp: "" });
            setTimeout(() => setAdding(false), 500);
          }}
          className="bg-[#FFF6DC] rounded-xl p-4 shadow flex flex-col gap-2 mb-4"
        >
          <div className="font-semibold text-[#2D2A32] mb-1">Add Scheduled Outreach</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="email"
              placeholder="Recipient Email"
              value={newOutreach.email}
              onChange={e => setNewOutreach({ ...newOutreach, email: e.target.value })}
              required
              className="rounded px-2 py-1 border border-gray-200 w-full"
            />
            <input
              type="text"
              placeholder="Subject"
              value={newOutreach.subject}
              onChange={e => setNewOutreach({ ...newOutreach, subject: e.target.value })}
              required
              className="rounded px-2 py-1 border border-gray-200 w-full"
            />
            <input
              type="datetime-local"
              value={newOutreach.timestamp}
              onChange={e => setNewOutreach({ ...newOutreach, timestamp: e.target.value })}
              required
              className="rounded px-2 py-1 border border-gray-200 w-full"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm mt-2 w-fit"
          >
            {adding ? "Adding..." : "Add Schedule"}
          </button>
        </form>
        {loading && <div className="text-[#2D2A32]">Loading outreach results...</div>}
        {error && <div className="text-red-500">{error}</div>}
        <div className="space-y-4">
          {!loading && !error && results.length === 0 && (
            <div className="text-gray-500">No outreach results found.</div>
          )}
          {results.map((s, i) => (
            <div key={i} className="bg-[#FFF6DC] rounded-2xl p-5 shadow flex flex-col gap-1">
              <div className="font-semibold text-[#2D2A32]">{s.subject || `Outreach to ${s.email}`}</div>
              <div className="text-xs text-gray-500">{s.timestamp ? new Date(s.timestamp).toLocaleString() : "No date"}</div>
              <div className={`text-xs ${s.status === "sent" ? "text-green-600" : "text-[#FEC260]"}`}>{s.status}</div>
              {s.error && (
                <div className="text-xs text-red-500">
                  Error: {typeof s.error === "string" ? s.error : JSON.stringify(s.error)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 