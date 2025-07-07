"use client";
import React, { useState, useEffect } from "react";
import jwt_decode from "jwt-decode";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("Hi {{name}},\n\nI love what {{company}} is doing in the {{category}} space! Let's connect.\n");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ email: string; name?: string; picture?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token) {
      setLoggedIn(true);
      fetchGmailStatus(token);
      // Try to decode profile info from JWT
      try {
        const decoded = jwt_decode(token);
        setProfile({
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
        });
      } catch {}
    }
  }, []);

  const fetchGmailStatus = async (token: string) => {
    try {
      const res = await fetch("https://ai-reachout.onrender.com/auth/gmail-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGmailConnected(!!data.connected);
    } catch {
      setGmailConnected(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("https://ai-reachout.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("jwt", data.token);
        setLoggedIn(true);
        fetchGmailStatus(data.token);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Login error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    setLoggedIn(false);
    setGmailConnected(false);
  };

  const handleConnectGmail = () => {
    // Redirect to backend OAuth with JWT/email as state
    window.location.href = `https://ai-reachout.onrender.com/auth/google?email=${email}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    // Simulate save delay
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FFE6A7] flex flex-col items-center py-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <h1 className="text-3xl font-bold mb-4 text-[#2D2A32]">Settings</h1>
        {!loggedIn ? (
          <form onSubmit={handleLogin} className="bg-[#FFF6DC] rounded-2xl p-6 shadow flex flex-col gap-4 mb-4">
            <div className="font-semibold text-[#2D2A32] mb-1">Login</div>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded px-2 py-1 border border-gray-200" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="rounded px-2 py-1 border border-gray-200" />
            <button type="submit" className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm">Login</button>
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </form>
        ) : (
          <div className="bg-[#FFF6DC] rounded-2xl p-6 shadow flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#2D2A32]">Logged in as {email}</span>
              <button onClick={handleLogout} className="text-xs text-red-500 underline">Logout</button>
            </div>
            {/* Profile Info Section */}
            {profile && (
              <div className="flex items-center gap-4 mt-2 p-2 bg-[#FFE6A7] rounded">
                {profile.picture && (
                  <img src={profile.picture} alt="Profile" className="w-12 h-12 rounded-full border" />
                )}
                <div>
                  <div className="font-semibold text-[#2D2A32]">{profile.name || "No Name"}</div>
                  <div className="text-xs text-gray-600">{profile.email}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="font-semibold text-[#2D2A32]">Gmail:</span>
              {gmailConnected ? (
                <span className="text-green-600">Connected</span>
              ) : (
                <button onClick={handleConnectGmail} className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm">Connect Gmail</button>
              )}
            </div>
          </div>
        )}
        <form onSubmit={handleSave} className="bg-[#FFF6DC] rounded-2xl p-6 shadow flex flex-col gap-4">
          <div>
            <label className="block font-semibold text-[#2D2A32] mb-1">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full rounded border border-gray-200 p-2"
              placeholder="Enter your API key"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#2D2A32] mb-1">Default Email Template</label>
            <textarea
              value={emailTemplate}
              onChange={e => setEmailTemplate(e.target.value)}
              className="w-full rounded border border-gray-200 p-2"
              rows={5}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm mt-2 w-fit"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {success && <div className="text-green-600 text-sm">Settings saved!</div>}
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </form>
      </div>
    </div>
  );
} 