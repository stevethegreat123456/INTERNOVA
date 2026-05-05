/**
 * @module StudentLogbooksPage
 * @description Allows students to manage their weekly logbook entries once placed.
 * - Fetches accepted applications to ensure the student has started an attachment.
 * - Provides a form to submit new weekly updates detailing tasks and skills gained.
 * - Displays previous entries along with any feedback received from the university supervisor.
 */
import React, { useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  CheckCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Logbook {
  id: string;
  application_id: string;
  student_id: string;
  week_number: number;
  content: string;
  supervisor_feedback: string | null;
  created_at: string;
}

export default function StudentLogbooksPage() {
  const [logbooks, setLogbooks] = useState<Logbook[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [week, setWeek] = useState<number>(1);
  const [content, setContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login?role=student");
      return;
    }

    const { data: apps } = await supabase
      .from("applications")
      .select("*, opportunities(*)")
      .eq("student_id", user.id)
      .eq("status", "accepted");

    if (apps && apps.length > 0) {
      setApplications(apps);
      setSelectedApp(apps[0].id);
    }
  };

  useEffect(() => {
    if (selectedApp) {
      fetchLogbooks();
    }
  }, [selectedApp]);

  useEffect(() => {
    const existingLog = logbooks.find((l) => l.week_number === week);
    if (existingLog && !existingLog.supervisor_feedback) {
      setContent(existingLog.content);
    } else {
      setContent("");
    }
  }, [week, logbooks]);

  const fetchLogbooks = async () => {
    const { data } = await supabase
      .from("logbooks")
      .select("*")
      .eq("application_id", selectedApp)
      .order("week_number", { ascending: false });
    if (data) {
      setLogbooks(data);
      if (data.length > 0) {
        setWeek(data[0].week_number + 1);
      } else {
        setWeek(1);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    if (!profileError) {
      setError(
        "Your account profile is incomplete or missing. This can happen if your account was created before recent database updates. Please contact support or create a new student account.",
      );
      setIsSubmitting(false);
      return;
    }

    const existingLog = logbooks.find((l) => l.week_number === week);
    if (existingLog) {
      if (existingLog.supervisor_feedback) {
        setError(
          `Week ${week} has already been reviewed by your supervisor. You cannot modify or submit a new entry for this week.`,
        );
        setIsSubmitting(false);
        return;
      }
      // If you want to let students update unreviewed logs, we would use an update.
      // The user requested to prevent logs for a week if reviewed.
      // For unreviewed, maybe we just block duplicate weeks entirely to avoid confusion? Yes, let's block entirely.
      // Actually, let's update if it exists but is unreviewed.
      const { error: updateError } = await supabase
        .from("logbooks")
        .update({
          content,
        })
        .eq("id", existingLog.id);

      if (updateError) {
        setError("Failed to update logbook: " + updateError.message);
      } else {
        setSuccess(`Logbook for Week ${week} updated successfully!`);
        setContent("");
        fetchLogbooks();
      }
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("logbooks").insert({
      application_id: selectedApp,
      student_id: user.id,
      week_number: week,
      content,
    });

    if (insertError) {
      setError("Failed to submit logbook: " + insertError.message);
    } else {
      setSuccess("Logbook submitted successfully!");
      setContent("");
      fetchLogbooks();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-navy text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight"
            >
              <BookOpen className="w-6 h-6 text-blue-400" />
              <span>Internova</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium border-l border-white/20 pl-6">
              <Link
                to="/student/dashboard"
                className="text-slate-300 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                to="/student/opportunities"
                className="text-slate-300 hover:text-white"
              >
                Opportunities
              </Link>
              <Link to="/student/logbooks" className="text-white">
                Logbooks
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link
              to="/student/settings"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Settings
            </Link>
            <div className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/20">
              <GraduationCap className="w-4 h-4" />
              Student Portal
            </div>
            <button
              className="text-slate-300 hover:text-white transition-colors"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Your Logbooks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit your weekly progress and view supervisor feedback.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-500">
            You need an accepted internship application to submit logbooks.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Select Internship
                    </label>
                    <select
                      value={selectedApp}
                      onChange={(e) => setSelectedApp(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    >
                      {applications.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.opportunities?.title} at{" "}
                          {app.opportunities?.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Week
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={week}
                      onChange={(e) => setWeek(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                  </div>
                </div>

                {selectedApp &&
                  (() => {
                    const app = applications.find((a) => a.id === selectedApp);
                    if (
                      app?.opportunities?.start_date &&
                      new Date(app.opportunities.start_date) > new Date()
                    ) {
                      return (
                        <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-sm font-medium flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-amber-500" />
                          You cannot submit logbooks yet. Your placement starts
                          on{" "}
                          {new Date(
                            app.opportunities.start_date,
                          ).toLocaleDateString()}
                          .
                        </div>
                      );
                    }
                    return (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5 focus-within:text-blue-600 transition-colors">
                            This Week's Progress
                          </label>
                          <textarea
                            required
                            rows={5}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={logbooks.some(
                              (l) =>
                                l.week_number === week && l.supervisor_feedback,
                            )}
                            placeholder="Describe what you worked on, learned, and any challenges faced..."
                            className="w-full px-4 py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-y min-h-[140px] disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                        {error && (
                          <div className="text-red-600 text-sm">{error}</div>
                        )}
                        {success && (
                          <div className="text-emerald-600 text-sm">
                            {success}
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={
                            isSubmitting ||
                            logbooks.some(
                              (l) =>
                                l.week_number === week && l.supervisor_feedback,
                            )
                          }
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting
                            ? "Submitting..."
                            : logbooks.some(
                                  (l) =>
                                    l.week_number === week &&
                                    l.supervisor_feedback,
                                )
                              ? "Already Reviewed"
                              : logbooks.some(
                                    (l) =>
                                      l.week_number === week &&
                                      !l.supervisor_feedback,
                                  )
                                ? "Update Logbook Entry"
                                : "Submit Logbook Entry"}
                        </button>
                      </>
                    );
                  })()}
              </form>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Previous Entries
              </h2>
              {logbooks.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No logbook entries for this internship yet.
                </p>
              ) : (
                logbooks.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200 rounded-xl shadow-sm p-6"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900">
                        Week {log.week_number}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">
                      {log.content}
                    </p>
                    {log.supervisor_feedback && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                          Supervisor Feedback
                        </h4>
                        <p className="text-slate-600 text-sm whitespace-pre-wrap">
                          {log.supervisor_feedback}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
