'use client';
import { useEffect, useState } from "react";
import { Card } from "../components/ui";
import { ProspectGenerator } from "../components/ProspectGenerator";
import { OutreachButton } from "../components/OutreachButton";

interface OutreachResult {
  email: string;
  status: string;
  timestamp: string;
  name?: string;
  error?: string;
  confirmed?: string;
}

export default function DashboardPage() {
  const [prospects, setProspects] = useState([]);
  const [results, setResults] = useState<OutreachResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch("https://ai-reachout.onrender.com/prospects")
      .then((res) => res.json())
      .then((data) => {
        setProspects(data);
        setLoading(false);
      });
    fetch("https://ai-reachout.onrender.com/results")
      .then((res) => res.json())
      .then((data) => setResults(data));
  }, []);

  // Helper to extract name from email if not present
  const getName = (result: OutreachResult) => {
    if (result.name && result.name.trim() !== "") return result.name;
    if (result.email) {
      const [namePart] = result.email.split("@");
      return namePart.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "-";
  };

  return (
    <main className="bg-gradient-to-tr from-pink-50 via-purple-100 relative backdrop-blur-2xl to-indigo-200 min-h-screen p-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-4xl font-bold text-indigo-500 flex items-center gap-3 mb-2">
             AI Outreach System
            </h1>
            <p className="text-black font-light">Generate prospects and run outreach campaigns with AI</p>
          </div>
          <ProspectGenerator />
          <OutreachButton />
        </div>
        {/* Sidebar Section */}
        <div className="space-y-8">
          {/* Stats Cards (now a single metric card) */}
          <Card className="p-6 rounded-2xl bg-transparent shadow-2xl">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 justify-between">
                <div className="group flex flex-col items-center cursor-pointer" title="Total number of prospects in your database">
                  <div className="text-sm">Prospects</div>
                  <div className="text-2xl font-bold text-black">{loading ? "..." : prospects.length}</div>
                </div>
                <div className="group flex flex-col items-center cursor-pointer" title="Number of emails successfully sent">
                  <div className="text-sm">Sent Mails</div>
                  <div className="text-2xl font-bold text-black">{results.filter(r => r.status === 'sent').length}</div>
                </div>
                <div className="group flex flex-col items-center cursor-pointer" title="Number of confirmed interested prospects">
                  <div className="text-sm">Confirmed</div>
                  <div className="text-2xl font-bold text-green-600">{results.filter(r => r.confirmed === 'true').length}</div>
                </div>
                <div className="group flex flex-col items-center cursor-pointer" title="Number of failed email attempts">
                  <div className="text-sm">Failed Mails</div>
                  <div className="text-2xl font-bold text-red-500">{results.filter(r => r.status === 'error').length}</div>
                </div>
              </div>
            </div>
          </Card>
          {/* Prospects Table */}
          <Card className="p-6 rounded-2xl bg-transparent shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold text-black">Prospects</span>
            </div>
            {/* Search bar */}
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or company..."
                className="w-full p-2 border border-gray-300 rounded-xl text-black bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-black">Name</th>
                    <th className="text-left py-2 px-2 font-medium text-black">Email</th>
                    <th className="text-left py-2 px-2 font-medium text-black">Company</th>
                    <th className="text-left py-2 px-2 font-medium text-black">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.filter(p =>
                    p.name?.toLowerCase().includes(search.toLowerCase()) ||
                    p.email?.toLowerCase().includes(search.toLowerCase()) ||
                    p.companySize?.toLowerCase().includes(search.toLowerCase())
                  ).slice(0, 2).map((prospect, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-2 text-black">{prospect.name}</td>
                      <td className="py-2 px-2 text-black">{prospect.email}</td>
                      <td className="py-2 px-2 text-black">{prospect.companySize}</td>
                      <td className="py-2 px-2 flex gap-2 items-center">
                        <button className="text-xs text-red-600 hover:underline" onClick={() => handleRemove(prospect.email)}>Remove</button>
                        <label className="flex flex-col items-center gap-1 cursor-pointer">
                          <span className="text-xs text-black">closed</span>
                          <input type="checkbox" className="accent-indigo-600" checked={!!prospect.reachedOut} onChange={e => handleMarkReachedOut(prospect.email, e.target.checked)} />
                        </label>
                      </td>
                    </tr>
                  ))}
                  {prospects.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-black text-center">No prospects yet.</td></tr>
                  )}
                </tbody>
              </table>
              {prospects.length > 2 && (
                <div className="flex justify-center mt-4">
                  <button className="text-black hover:underline font-medium text-sm" onClick={() => setShowModal('prospects')}>See all</button>
                </div>
              )}
            </div>
          </Card>
          {/* Sent Emails Table */}
          <Card className="p-6 rounded-2xl bg-transparent shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold text-black">People Emailed</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-black"> Name</th>
                    <th className="text-left py-2 px-2 font-medium text-black"> Email</th>
                    <th className="text-left py-2 px-2 font-medium text-black"> Date</th>
                    <th className="text-left py-2 px-2 font-medium text-black"> Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.filter(r => r.status === 'sent').slice(0, 2).map((result, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-2 text-black">{getName(result)}</td>
                      <td className="py-2 px-2 text-black">{result.email}</td>
                      <td className="py-2 px-2 text-black">{new Date(result.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-2">
                        {result.confirmed === 'true' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Confirmed</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {results.filter(r => r.status === 'sent').length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-black text-center">No emails sent yet.</td></tr>
                  )}
                </tbody>
              </table>
              {results.filter(r => r.status === 'sent').length > 2 && (
                <div className="flex justify-center mt-4">
                  <button className="text-black hover:underline font-medium text-sm">See all</button>
                </div>
              )}
            </div>
          </Card>
          {/* Confirmed Prospects Table */}
          <Card className="p-6 rounded-2xl bg-transparent shadow-2xl mt">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-semibold text-green-700">Confirmed/Interested Prospects</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-black"> Name</th>
                    <th className="text-left py-2 px-2 font-medium text-black"> Email</th>
                    <th className="text-left py-2 px-2 font-medium text-black"> Date Confirmed</th>
                    <th className="text-left py-2 px-2 font-medium text-black"> Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.filter(r => r.confirmed === 'true').map((result, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-2 text-black">{getName(result)}</td>
                      <td className="py-2 px-2 text-black">{result.email}</td>
                      <td className="py-2 px-2 text-black">{result.timestamp ? new Date(result.timestamp).toLocaleString() : '-'}</td>
                      <td className="py-2 px-2">
                        <button className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Schedule Meeting</button>
                      </td>
                    </tr>
                  ))}
                  {results.filter(r => r.confirmed === 'true').length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-black text-center">No confirmed prospects yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
} 