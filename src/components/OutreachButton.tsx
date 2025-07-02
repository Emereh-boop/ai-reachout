"use client";
import { useState } from "react";
import { Card, Button } from "./ui";
import { Mail, Loader2, CheckCircle, XCircle, BarChart3 } from "lucide-react";

interface OutreachResult {
  email: string;
  status: string;
  timestamp: string;
  error?: string;
}

export function OutreachButton() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OutreachResult[]>([]);
  const [message, setMessage] = useState("");

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
        setMessage("✅ Outreach completed successfully!");
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
        <h2 className="text-md font- text-gray-800 flex items-center gap-2">
          {loading ? (
            <div className="inline-flex gap-2 text-black ">
              <span>Preparing Launch</span>
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
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl"
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
    </Card>
  );
}
