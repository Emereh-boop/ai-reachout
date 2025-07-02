"use client";
import { useState, useEffect, useRef } from "react";
import { Card, Button, Modal } from "./ui";
import { Mail, Loader2, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import io from "socket.io-client";
import type { Socket } from "socket.io-client";

interface OutreachResult {
  email: string;
  status: string;
  timestamp: string;
  error?: string;
}

type Preview = { subject: string; body: string; html: string; email: string; index: number };

export function OutreachButton() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OutreachResult[]>([]);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editSubject, setEditSubject] = useState<string>("");
  const [editBody, setEditBody] = useState<string>("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io("https://ai-reachout.onrender.com", { transports: ["websocket"] });
      socketRef.current.on("outreach:prepare", (data: any) => {
        setProgress(`Preparing email for ${data.name || data.email}...`);
      });
      socketRef.current.on("outreach:sent", (data: any) => {
        setProgress(`Email sent to ${data.name || data.email}`);
      });
      socketRef.current.on("outreach:failed", (data: any) => {
        setProgress(`Failed to send email to ${data.name || data.email}`);
      });
      // Listen for preview event (to be emitted from backend)
      socketRef.current.on("outreach:preview", (data: any) => {
        setPreview(data);
        setShowPreview(true);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (preview) {
      setEditSubject(preview.subject);
      setEditBody(preview.body);
    }
  }, [preview]);

  const runOutreach = async () => {
    setLoading(true);
    setMessage("");
    setResults([]);

    try {
      const response = await fetch("https://ai-reachout.onrender.com/outreach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status === "outreach complete") {
        // Fetch the results
        const resultsResponse = await fetch("https://ai-reachout.onrender.com/results");
        const resultsData = await resultsResponse.json();
        setResults(resultsData);
        setMessage("Outreach completed successfully!");
      } else {
        setMessage(data.error || "Failed to run outreach");
      }
    } catch (error) {
      setMessage("Error connecting to server");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card className="p-4 rounded-2xl bg-transparent shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
          {loading ? (
            <div className="inline-flex gap-2 text-black ">
              <span>{progress || "Preparing Launch"}</span>
              <Loader2 className="animate-spin w-4 h-4 text-indigo-500" />
            </div>
          ) : message ? (
            message.includes("success") ? (
              <div className="inline-flex gap-2 text-black ">
                <div className="bg-green-500 w-4 h-4 rounded-full"></div>
                <span>Launch Successful</span>
              </div>
            ) : (
              <div className="inline-flex gap-2 text-black ">
                <div className="bg-red-500 w-4 h-4 rounded-full"></div>
                <span>Launch Failed</span>
              </div>
            )
          ) : (
            "Click. Connect. Close."
          )}
        </h2>
        <Button
          onClick={runOutreach}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-normal py-3 px-6 rounded-xl"
        >
          <span className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Run Outreach
          </span>
        </Button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md mb-6 ${
            message.includes("success")
              ? "bg-indigo-100 text-indigo-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-indigo-700 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Outreach Results
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border"
              >
                <div className="flex-1">
                  <div className="font-medium text-black">{result.email}</div>
                  <div className="text-sm text-black">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span
                    className={`font-semibold ${
                      result.status === "sent"
                        ? "text-green-600"
                        : result.status === "error"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {result.status.toUpperCase()}
                  </span>
                </div>
                {result.error && (
                  <div className="text-xs text-red-600 ml-2">
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border">
            <div className="text-sm">
              <div className="font-semibold text-indigo-700 flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> Summary
              </div>
              <div className="text-black">Total emails: {results.length}</div>
              <div className="text-black">
                Sent: {results.filter((r) => r.status === "sent").length}
              </div>
              <div className="text-black">
                Errors: {results.filter((r) => r.status === "error").length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal open={showPreview && !!preview} onClose={() => { setShowPreview(false); if (socketRef.current && preview) socketRef.current.emit('outreach:reject', { email: preview.email, index: preview.index }); }} title="Proofread & Approve Email">
        {preview && (
          <div>
            <div className="mb-4">
              <div className="font-bold text-black mb-2">To: {preview.email}</div>
              <div className="font-bold text-black mb-2">Subject:</div>
              <input type="text" className="w-full p-2 mb-2 border rounded" value={editSubject} onChange={e => setEditSubject(e.target.value)} />
              <div className="font-bold text-black mb-2">Body:</div>
              <textarea className="w-full p-2 mb-2 border rounded min-h-[120px]" value={editBody} onChange={e => setEditBody(e.target.value)} />
              <div className="bg-gray-50 p-4 rounded-xl border text-black" dangerouslySetInnerHTML={{ __html: preview.html }} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => { setShowPreview(false); if (socketRef.current) socketRef.current.emit('outreach:reject', { email: preview.email, index: preview.index }); }} className="bg-red-600 hover:bg-red-700 text-white">Reject</Button>
              <Button onClick={() => { setShowPreview(false); if (socketRef.current) socketRef.current.emit('outreach:approve', { email: preview.email, index: preview.index, subject: editSubject, body: editBody, html: preview.html }); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">Approve & Send</Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
 