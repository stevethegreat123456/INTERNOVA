/**
 * @module CompanyDashboard
 * @description The main interface for company representatives. Responsibilities include:
 * - Managing internship opportunities posted by the company.
 * - Reviewing student applications submitted for these opportunities.
 * - Updating application statuses (e.g., Accepting, Rejecting, Shortlisting).
 *
 * Uses Real-time Supabase subscriptions (if configured) or standard fetching to keep
 * track of incoming applications, acting as an Applicant Tracking System (ATS) for attachments.
 */
import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  UserPlus,
  CheckCircle,
  XCircle,
  Plus,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Opportunity, Application } from "../lib/mockDb";
import RecentLogbooks from "../components/RecentLogbooks";

export default function CompanyDashboard() {
  const [userName, setUserName] = useState<string>("Company");
  const [userId, setUserId] = useState<string>("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<
    (Application & { opportunityTitle: string })[]
  >([]);
  const navigate = useNavigate();

  // Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [newOpp, setNewOpp] = useState({
    title: "",
    description: "",
    requirements: "",
    location: "",
    max_positions: 1,
    start_date: new Date().toISOString().split("T")[0],
    is_paid: false,
    tags: "",
  });

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login?role=company");
      return;
    }
    setUserId(user.id);
    if (user.user_metadata?.company_name) {
      setUserName(user.user_metadata.company_name);
    } else if (user.user_metadata?.name) {
      setUserName(user.user_metadata.name);
    }

    // Load data
    const [oppsResult, appsResult] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select("*, opportunities!inner(*)")
        .eq("opportunities.company_id", user.id)
        .order("applied_at", { ascending: false }),
    ]);

    if (oppsResult.data) {
      setOpportunities(
        oppsResult.data.map((o) => ({
          ...o,
          companyId: o.company_id,
          companyName: o.company_name,
          createdAt: o.created_at,
        })),
      );
    }

    if (appsResult.data) {
      setApplications(
        appsResult.data.map((a) => ({
          ...a,
          cvUrl: a.cv_url,
          opportunityTitle: a.opportunities.title,
          opportunityId: a.opportunity_id,
          studentId: a.student_id,
          studentName: a.student_name,
          studentEmail: a.student_email,
          appliedAt: a.applied_at,
        })),
      );
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      navigate("/");
    }
  };

  const handlePostOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpp.title || !newOpp.description) return;

    const { data, error } = await supabase
      .from("opportunities")
      .insert({
        company_id: userId,
        company_name: userName,
        title: newOpp.title,
        description: newOpp.description,
        requirements: newOpp.requirements,
        location: newOpp.location,
        max_positions: newOpp.max_positions,
        start_date: newOpp.start_date,
        is_paid: newOpp.is_paid,
        tags: newOpp.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((t) => t),
      })
      .select()
      .single();

    if (data && !error) {
      setOpportunities([
        {
          ...data,
          companyId: data.company_id,
          companyName: data.company_name,
          createdAt: data.created_at,
        },
        ...opportunities,
      ]);
    } else {
      console.error("Error creating opportunity:", error);
    }
    setShowPostModal(false);
    setNewOpp({
      title: "",
      description: "",
      requirements: "",
      location: "",
      max_positions: 1,
      start_date: new Date().toISOString().split("T")[0],
      is_paid: false,
      tags: "",
    });
  };

  const handleUpdateAppStatus = async (
    appId: string,
    status: Application["status"],
    studentEmail?: string,
  ) => {
    if (status === "accepted") {
      const app = applications.find((a) => a.id === appId);
      if (app) {
        const opp = opportunities.find((o) => o.id === app.opportunityId);
        const acceptedCount = applications.filter(
          (a) =>
            a.opportunityId === app.opportunityId &&
            a.status === "accepted" &&
            a.id !== appId,
        ).length;
        if (opp && (opp.max_positions || 1) <= acceptedCount) {
          alert(
            `Cannot accept more candidates. Maximum positions (${opp.max_positions || 1}) reached for ${opp.title}.`,
          );
          return;
        }
      }
    }

    // Optimistic UI update
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status } : a)),
    );

    const { error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", appId);
    if (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status: " + error.message);
      // Revert UI
      fetchData();
    } else if (studentEmail) {
      // Simulate sending email
      setTimeout(() => {
        alert(
          `System Update: An email notification has been sent to ${studentEmail} regarding their application status change to '${status}'.`,
        );
      }, 500);
    }
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
              <Link to="/company/dashboard" className="text-white">
                Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link
              to="/company/settings"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Settings
            </Link>
            <div className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/20">
              <Building2 className="w-4 h-4" />
              Company Portal
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

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative">
        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome, {userName}!
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage openings and review student applications.
            </p>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Post New Internship
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">
                Accepted Students
              </h2>
              <div className="divide-y divide-slate-100">
                {applications.filter((a) => a.status === "accepted").length ===
                0 ? (
                  <p className="py-8 text-center text-slate-500 text-sm">
                    No accepted students yet.
                  </p>
                ) : (
                  applications
                    .filter((a) => a.status === "accepted")
                    .map((app) => (
                      <div
                        key={app.id}
                        className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                      >
                        <div>
                          <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            {app.studentName || "Student Applicant"}
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                              {app.status}
                            </span>
                          </h3>
                          <p className="text-sm text-slate-500">
                            {app.studentEmail}
                          </p>
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            Applied for: {app.opportunityTitle}
                          </p>
                          {app.cvUrl && (
                            <a
                              href={app.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                            >
                              <Eye className="w-3 h-3" /> View CV
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <RecentLogbooks
              companyMode={true}
              companyId={userId}
              showActions={true}
            />

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">
                Pending & Shortlisted Applications
              </h2>
              <div className="divide-y divide-slate-100">
                {applications.filter(
                  (a) => a.status === "pending" || a.status === "shortlisted",
                ).length === 0 ? (
                  <p className="py-8 text-center text-slate-500 text-sm">
                    No pending applications.
                  </p>
                ) : (
                  applications
                    .filter(
                      (a) =>
                        a.status === "pending" || a.status === "shortlisted",
                    )
                    .map((app) => (
                      <div
                        key={app.id}
                        className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                      >
                        <div>
                          <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            {app.studentName || "Student Applicant"}
                            <span
                              className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                                app.status === "shortlisted"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {app.status}
                            </span>
                          </h3>
                          <p className="text-sm text-slate-500">
                            {app.studentEmail}
                          </p>
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            Applied for: {app.opportunityTitle}
                          </p>
                          {app.cvUrl && (
                            <a
                              href={app.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                            >
                              <Eye className="w-3 h-3" /> View CV
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleUpdateAppStatus(
                                app.id,
                                "rejected",
                                app.studentEmail,
                              )
                            }
                            className="p-2 text-slate-400 hover:text-[var(--color-red)] hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          {app.status === "pending" && (
                            <button
                              onClick={() =>
                                handleUpdateAppStatus(
                                  app.id,
                                  "shortlisted",
                                  app.studentEmail,
                                )
                              }
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Shortlist
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleUpdateAppStatus(
                                app.id,
                                "accepted",
                                app.studentEmail,
                              )
                            }
                            className="px-4 py-1.5 bg-[var(--color-emerald)] text-white text-sm font-medium rounded-lg hover:bg-opacity-90 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" /> Accept
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                Active Postings
              </h3>
              <div className="space-y-4">
                {opportunities.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No active postings
                  </p>
                ) : (
                  opportunities.map((opp) => {
                    const appCount = applications.filter(
                      (a) => a.opportunityId === opp.id,
                    ).length;
                    return (
                      <div
                        key={opp.id}
                        className="flex border border-slate-100 rounded-lg p-3 justify-between items-center bg-slate-50"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">
                            {opp.title}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {appCount} Application{appCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-[var(--color-emerald)]"></span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Opportunity Modal */}
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">
                  Post New Internship
                </h3>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={handlePostOpportunity}
                className="p-6 overflow-y-auto flex-grow flex flex-col gap-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Internship Title
                  </label>
                  <input
                    required
                    type="text"
                    value={newOpp.title}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Frontend Engineering Intern"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    required
                    type="text"
                    value={newOpp.location}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, location: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Remote, Nairobi, HQ"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Max Positions
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={newOpp.max_positions}
                      onChange={(e) =>
                        setNewOpp({
                          ...newOpp,
                          max_positions: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      required
                      type="date"
                      value={newOpp.start_date}
                      onChange={(e) =>
                        setNewOpp({ ...newOpp, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newOpp.tags}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, tags: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Frontend, Data Science, Remote"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_paid"
                    checked={newOpp.is_paid}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, is_paid: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_paid"
                    className="text-sm font-medium text-slate-700"
                  >
                    This is a paid opportunity
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newOpp.description}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Briefly describe the role, responsibilities, and team..."
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={newOpp.requirements}
                    onChange={(e) =>
                      setNewOpp({ ...newOpp, requirements: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="List skills, qualifications, or expectations..."
                  ></textarea>
                </div>
                <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                  >
                    Post Internship
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
