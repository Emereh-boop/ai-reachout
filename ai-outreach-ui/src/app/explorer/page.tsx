"use client";
import React, { useEffect, useState } from "react";

interface Business {
  name: string;
  category?: string;
  website?: string;
  email?: string;
  location?: string;
  companySize?: string;
  reachedOut?: string;
}

export default function ExplorerPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newBusiness, setNewBusiness] = useState<Business & {
    socials?: string;
    contactPerson?: string;
    contactRole?: string;
    phone?: string;
  }>({ name: "", email: "" });
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichedData, setEnrichedData] = useState<{ [email: string]: Partial<Business> & { title?: string; description?: string; phone?: string; social?: string } }>({});

  const fetchBusinesses = () => {
    setLoading(true);
    fetch("https://ai-reachout.onrender.com/search-businesses?limit=20")
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setBusinesses(data.results);
        } else {
          setError("Failed to fetch businesses");
        }
        setLoading(false);
      })
      .catch(err => {
        setError("Error fetching businesses");
        console.error(err)
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("https://ai-reachout.onrender.com/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBusiness),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setNewBusiness({ name: "", email: "" });
        fetchBusinesses();
      } else {
        setError(data.error || "Failed to add business");
      }
    } catch (err) {
      setError("Error adding business");
      console.error(err);
    }
    setAdding(false);
  };

  const handleDelete = async (email: string) => {
    setDeleteLoading(email);
    setError(null);
    try {
      const res = await fetch("https://ai-reachout.onrender.com/prospects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.status === "removed") {
        fetchBusinesses();
      } else {
        setError("Failed to delete business");
      }
    } catch (err) {
      setError("Error deleting business");
      console.error(err);
    }
    setDeleteLoading(null);
  };

  const handleStatusUpdate = async (email: string, reachedOut: boolean) => {
    setStatusLoading(email);
    setError(null);
    try {
      const res = await fetch("https://ai-reachout.onrender.com/prospects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reachedOut }),
      });
      const data = await res.json();
      if (data.status) {
        fetchBusinesses();
      } else {
        setError("Failed to update status");
      }
    } catch (err) {
      setError("Error updating status");
      console.error(err);
    }
    setStatusLoading(null);
  };

  const handleEnrichAll = async () => {
    setEnrichingAll(true);
    setError(null);
    try {
      const res = await fetch("https://ai-reachout.onrender.com/enrich", { method: "POST" });
      const data = await res.json();
      if (data.status === "enriched") {
        fetchBusinesses();
      } else {
        setError("Failed to enrich all businesses");
      }
    } catch (err) {
      setError("Error enriching all businesses");
      console.error(err);
    }
    setEnrichingAll(false);
  };

  const handleEnrichBusiness = async (b: Business) => {
    if (!b.website) return;
    setEnrichingId(b.email || b.name);
    setError(null);
    try {
      const res = await fetch("https://ai-reachout.onrender.com/enrich-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: b.website, businessData: b }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setEnrichedData(prev => ({ ...prev, [b.email || b.name || "unknown"]: data.data }));
      } else {
        setError("Failed to enrich business");
      }
    } catch (err) {
      setError("Error enriching business");
      console.error(err);
    }
    setEnrichingId(null);
  };

  return (
    <div className="min-h-screen bg-[#FFE6A7] flex flex-col items-center py-8">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <h1 className="text-3xl font-bold mb-4 text-[#2D2A32]">Prospect Explorer</h1>
        <form onSubmit={handleAddBusiness} className="bg-[#FFF6DC] rounded-xl p-4 shadow flex flex-col gap-2 mb-4">
          <div className="font-semibold text-[#2D2A32] mb-1">Add New Business</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Business Name</label>
              <input type="text" placeholder="Business Name" value={newBusiness.name} onChange={e => setNewBusiness({ ...newBusiness, name: e.target.value })} required className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input type="email" placeholder="Email" value={newBusiness.email} onChange={e => setNewBusiness({ ...newBusiness, email: e.target.value })} required className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Website</label>
              <input type="text" placeholder="Website" value={newBusiness.website || ""} onChange={e => setNewBusiness({ ...newBusiness, website: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Category</label>
              <input type="text" placeholder="Category" value={newBusiness.category || ""} onChange={e => setNewBusiness({ ...newBusiness, category: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Location</label>
              <input type="text" placeholder="Location" value={newBusiness.location || ""} onChange={e => setNewBusiness({ ...newBusiness, location: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Company Size</label>
              <input type="text" placeholder="Company Size" value={newBusiness.companySize || ""} onChange={e => setNewBusiness({ ...newBusiness, companySize: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Socials</label>
              <input type="text" placeholder="Socials (comma separated)" value={newBusiness.socials || ""} onChange={e => setNewBusiness({ ...newBusiness, socials: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
        </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Contact Person</label>
              <input type="text" placeholder="Contact Person" value={newBusiness.contactPerson || ""} onChange={e => setNewBusiness({ ...newBusiness, contactPerson: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Contact Role</label>
              <input type="text" placeholder="Contact Role (e.g. CEO)" value={newBusiness.contactRole || ""} onChange={e => setNewBusiness({ ...newBusiness, contactRole: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone</label>
              <input type="text" placeholder="Phone" value={newBusiness.phone || ""} onChange={e => setNewBusiness({ ...newBusiness, phone: e.target.value })} className="rounded px-2 py-1 border border-gray-200 w-full" />
            </div>
          </div>
          <button type="submit" disabled={adding} className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm mt-2 w-fit">{adding ? "Adding..." : "Add Business"}</button>
        </form>
        <div className="bg-[#FFF6DC] rounded-xl p-4 shadow flex flex-col gap-2 mb-4">
          <button onClick={handleEnrichAll} disabled={enrichingAll} className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm mt-2 w-fit">
            {enrichingAll ? "Enriching all..." : "Enrich All Businesses"}
          </button>
        </div>
        {loading && <div className="text-[#2D2A32]">Loading businesses...</div>}
        {error && <div className="text-red-500">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!loading && !error && businesses.length === 0 && (
            <div className="col-span-2 text-gray-500">No businesses found.</div>
          )}
          {businesses.map((b, i) => (
            <div key={i} className="bg-[#FFF6DC] rounded-2xl p-6 shadow flex flex-col gap-2">
              <div className="text-xl font-semibold text-[#2D2A32]">{b.name}</div>
              <div className="text-sm text-gray-500">{b.category}</div>
              {b.website && (
                <a href={`https://${b.website}`} target="_blank" rel="noopener noreferrer" className="text-[#FEC260] underline text-xs mt-2">{b.website}</a>
              )}
              {b.website && (
                <button onClick={() => handleEnrichBusiness(b)} disabled={enrichingId === (b.email || b.name)} className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-3 py-1 rounded-full text-xs mt-2 transition">
                  {enrichingId === (b.email || b.name) ? "Enriching..." : "Enrich"}
                </button>
              )}
              {/* Show enriched data if available */}
              {enrichedData[b.email || b.name || "unknown"] && (
                <div className="bg-[#FFF6DC] border border-[#FFD1DC] rounded p-2 mt-2 text-xs">
                  <div><b>Title:</b> {enrichedData[b.email || b.name || "unknown"].title}</div>
                  <div><b>Description:</b> {enrichedData[b.email || b.name || "unknown"].description}</div>
                  <div><b>Email:</b> {enrichedData[b.email || b.name || "unknown"].email}</div>
                  <div><b>Phone:</b> {enrichedData[b.email || b.name || "unknown"].phone}</div>
                  <div><b>Social:</b> {enrichedData[b.email || b.name || "unknown"].social}</div>
                </div>
              )}
              {b.location && (
                <div className="text-xs text-gray-400">{b.location}</div>
              )}
              {b.companySize && (
                <div className="text-xs text-gray-400">Size: {b.companySize}</div>
              )}
              {b.email && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleDelete(b.email!)} disabled={deleteLoading === b.email} className="bg-red-200 hover:bg-red-300 text-red-800 font-semibold px-3 py-1 rounded-full text-xs transition">
                    {deleteLoading === b.email ? "Deleting..." : "Delete"}
                  </button>
                  <button onClick={() => handleStatusUpdate(b.email!, b.reachedOut !== "true")}
                    disabled={statusLoading === b.email}
                    className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-3 py-1 rounded-full text-xs transition">
                    {statusLoading === b.email ? "Updating..." : b.reachedOut === "true" ? "Mark as Not Reached" : "Mark as Reached"}
                  </button>
                </div>
              )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
} 