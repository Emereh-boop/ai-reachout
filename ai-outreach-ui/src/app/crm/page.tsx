"use client";
import React, { useEffect, useState } from "react";

interface Business {
  name: string;
  email?: string;
  category?: string;
  website?: string;
  reachedOut?: string;
  contactPerson?: string;
  contactRole?: string;
  socials?: string;
  phone?: string;
}

interface OutreachResult {
  email: string;
  status: string;
  timestamp?: string;
  subject?: string;
  error?: string;
}

export default function CrmPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [results, setResults] = useState<OutreachResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [email: string]: string }>({});
  const [noteInput, setNoteInput] = useState<{ [email: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bizRes, resRes] = await Promise.all([
        fetch("https://ai-reachout.onrender.com/search-businesses?limit=100"),
        fetch("https://ai-reachout.onrender.com/results"),
      ]);
      const bizData = await bizRes.json();
      const resData = await resRes.json();
      if (bizData.status === "success") {
        setBusinesses(bizData.results);
      } else {
        setError("Failed to fetch businesses");
      }
      setResults(Array.isArray(resData) ? resData : []);
      // Load notes from localStorage
      const stored = localStorage.getItem("crmNotes");
      if (stored) setNotes(JSON.parse(stored));
    } catch (err) {
      setError("Error fetching data");
      setBusinesses([]);
      setResults([]);
      console.error(err);
    }
    setLoading(false);
  };

  const handleNoteChange = (email: string, value: string) => {
    setNoteInput({ ...noteInput, [email]: value });
  };

  const handleAddNote = (email: string) => {
    const updated = { ...notes, [email]: noteInput[email] };
    setNotes(updated);
    setNoteInput({ ...noteInput, [email]: "" });
    localStorage.setItem("crmNotes", JSON.stringify(updated));
  };

  // Group outreach results by business email
  const businessWithResults = businesses.filter((b) =>
    results.some((r) => r.email === b.email)
  );

  return (
    <div className="min-h-screen bg-[#FFE6A7] flex flex-col items-center py-8">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <h1 className="text-3xl font-bold mb-4 text-[#2D2A32]">CRM</h1>
        {loading && (
          <div className="text-[#2D2A32]">
            Loading businesses and outreach history...
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!loading && !error && businessWithResults.length === 0 && (
            <div className="col-span-2 text-gray-500">
              No businesses with outreach history found.
            </div>
          )}
          {businessWithResults.map((b, i) => (
            <div
              key={i}
              className="bg-[#FFF6DC] rounded-2xl p-3 shadow flex flex-col gap-2"
            >
              <div className="font-semibold text-[#2D2A32]">{b.name}</div>
              <div className="text-xs text-gray-500">{b.category}</div>
              <div className="text-xs text-gray-400">{b.email}</div>
              <div className="text-xs text-gray-400">
                {b.contactPerson} {b.contactRole && `(${b.contactRole})`}
              </div>
              <div className="text-xs text-gray-400">{b.phone}</div>
              <div className="text-xs text-gray-400">{b.socials}</div>
              <div
                className={`text-xs ${
                  b.reachedOut === "true" ? "text-green-600" : "text-[#FEC260]"
                }`}
              >
                {b.reachedOut === "true" ? "Outreach Sent" : "Not Reached"}
              </div>
              {/* Outreach history */}
              <div className="mt-2">
                <div className="text-xs text-[#2D2A32] font-semibold mb-1">
                  Outreach History
                </div>
                <div className="space-y-1">
                  {results
                    .filter((r) => r.email === b.email)
                    .map((r, idx) => (
                      <div
                        key={idx}
                        className="bg-[#ffed82] rounded p-1 text-xs flex flex-col"
                      >
                        <span>
                          <b>Subject:</b> {r.subject || "(No subject)"}
                        </span>
                        <span>
                          <b>Status:</b> {r.status}
                        </span>
                        <span>
                          <b>Date:</b>{" "}
                          {r.timestamp
                            ? new Date(r.timestamp).toLocaleString()
                            : "No date"}
                        </span>
                        {r.error && (
                          <div className="text-xs text-red-500">
                            Error:{" "}
                            {typeof r.error === "string"
                              ? r.error
                              : JSON.stringify(r.error)}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
              {/* Notes section (persistent via localStorage) */}
              <div className="mt-2">
                <div className="text-xs text-[#2D2A32] font-semibold mb-1">
                  Notes
                </div>
                <textarea
                  value={noteInput[b.email || b.name || ""] || ""}
                  onChange={(e) =>
                    handleNoteChange(b.email || b.name || "", e.target.value)
                  }
                  className="w-full rounded border border-gray-200 p-1 text-xs mb-1"
                  placeholder="Add a note..."
                  rows={2}
                />
                <button
                  onClick={() => handleAddNote(b.email || b.name || "")}
                  className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-3 py-1 rounded-full text-xs transition"
                  disabled={!noteInput[b.email || b.name || ""]}
                >
                  Add Note
                </button>
                {notes[b.email || b.name || ""] && (
                  <div className="mt-1 text-xs text-[#2D2A32] bg-[#ffed82] rounded p-1">
                    {notes[b.email || b.name || ""]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
