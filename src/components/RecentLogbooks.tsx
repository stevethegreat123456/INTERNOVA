import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  FileText,
  CheckCircle,
  Clock,
  MessageSquare,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RecentLogbooks({
  universityMode = false,
  universityName = "",
  companyMode = false,
  companyId = "",
  showActions = true,
}) {
  const [logbooks, setLogbooks] = useState<any[]>([]);
  const [selectedLogbook, setSelectedLogbook] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogbooks();
  }, [universityMode, universityName, companyMode, companyId]);

  const fetchLogbooks = async () => {
    const { data: lbs, error } = await supabase
      .from("logbooks")
      .select(
        "*, applications!inner(student_name, student_email, opportunity_id, opportunities!inner(company_id))",
      );

    if (error) {
      console.error("Error fetching logbooks:", error);
      return;
    }

    let results = lbs || [];

    // Filter out logbooks that have already been reviewed
    results = results.filter((lb) => !lb.supervisor_feedback);

    if (universityMode && universityName) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("university", universityName);
      if (profiles) {
        const sIds = profiles.map((p) => p.id);
        results = results.filter((lb) => sIds.includes(lb.student_id));
      }
    } else if (companyMode && companyId) {
      results = results.filter((lb) => {
        const app = lb.applications as any;
        return app?.opportunities?.company_id === companyId;
      });
    }

    results.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setLogbooks(results.slice(0, 5));
  };

  const handleReviewLogbook = (lb: any) => {
    setSelectedLogbook(lb);
    setFeedbackText(lb.supervisor_feedback || "");
  };

  const submitFeedback = async () => {
    if (!selectedLogbook) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("logbooks")
      .update({ supervisor_feedback: feedbackText })
      .eq("id", selectedLogbook.id);
    setIsSubmitting(false);

    if (error) {
      alert("Failed to submit feedback: " + error.message);
    } else {
      setSelectedLogbook(null);
      fetchLogbooks(); // Refresh badges
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between border-b pb-2 mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Recent Logbooks Activity
        </h3>
        {showActions && !companyMode && (
          <button
            onClick={() => navigate("/supervisor/logbooks")}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All Logbooks <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {logbooks.length === 0 ? (
        <p className="text-slate-500 text-sm py-4">No recent logbooks found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">
                  Student Name
                </th>
                <th className="px-4 py-3 font-medium">Week</th>
                <th className="px-4 py-3 font-medium">Content Preview</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted At</th>
                {showActions && (
                  <th className="px-4 py-3 font-medium rounded-tr-lg">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logbooks.map((lb) => (
                <tr key={lb.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">
                      {(lb.applications as any)?.student_name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(lb.applications as any)?.student_email || ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-600">
                    Week {lb.week_number}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-500 max-w-[200px] truncate">
                      {lb.content}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {lb.supervisor_feedback ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 emerald-600" />{" "}
                        Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 amber-600" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-medium">
                    {new Date(lb.created_at).toLocaleDateString()}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReviewLogbook(lb)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100 transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLogbook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" /> Provide
                Feedback
              </h3>
              <button
                onClick={() => setSelectedLogbook(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2">
                  Student Logbook Entry (Week {selectedLogbook.week_number})
                </h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedLogbook.content}
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Your Feedback
                </label>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide your feedback..."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedLogbook(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitFeedback}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Submit Feedback"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
