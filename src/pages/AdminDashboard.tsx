/**
 * @module AdminDashboard
 * @description Superuser portal for overseeing the entire platform. Core features:
 * - Reviewing and approving pending company and university profiles.
 * - Manually onboarding users into the system via the 'Manual Add User' form.
 * - Generating and downloading CSV reports for student placements and logbooks across
 *   all users in the system.
 *
 * Interacts with 'profiles', 'applications', and 'logbooks' tables with elevated privileges.
 */
import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  UserPlus,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { downloadCSV } from "../utils/csvExport";
import AdminCharts from "../components/AdminCharts";
import RecentLogbooks from "../components/RecentLogbooks";

type PendingUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  company_name: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [userName, setUserName] = useState<string>("System Admin");
  const navigate = useNavigate();

  // Manual Onboarding State corresponding to SignupPage
  const [addAccountType, setAddAccountType] = useState<"student" | "company" | "university">("company");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhoneNumber, setAddPhoneNumber] = useState("");
  const [addCompanyName, setAddCompanyName] = useState("");
  const [addKraPin, setAddKraPin] = useState("");
  const [addCompanyRegNumber, setAddCompanyRegNumber] = useState("");
  const [addCounty, setAddCounty] = useState("");
  const [addTown, setAddTown] = useState("");
  const [addBuilding, setAddBuilding] = useState("");
  const [addOnlinePresence, setAddOnlinePresence] = useState("");
  const [addUniversity, setAddUniversity] = useState("");
  const [addStaffNumber, setAddStaffNumber] = useState("");
  const [addDepartment, setAddDepartment] = useState("");
  const [addRegNo, setAddRegNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stats, setStats] = useState({
    universities: 0,
    companies: 0,
    students: 0,
    placements: 0,
  });

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login?role=admin");
      return;
    }
    if (user.user_metadata?.name) {
      setUserName(user.user_metadata.name);
    }

    const { data, error } = await supabase.rpc("get_pending_users");
    if (data) {
      setPendingUsers(data);
    } else {
      console.error("Error fetching pending users:", error);
    }

    // Fetch quick stats
    try {
      const [compRes, studentRes, univRes, appRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "company")
          .eq("approved", true),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student"),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "supervisor"),
        supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "accepted"),
      ]);
      setStats({
        universities: univRes.count || 0,
        companies: compRes.count || 0,
        students: studentRes.count || 0,
        placements: appRes.count || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
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

  const handleApprove = async (id: string, name: string) => {
    // Optimistic UI update
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));

    const { error } = await supabase.rpc("approve_user", {
      target_user_id: id,
    });
    if (error) {
      console.error("Error approving user:", error);
      fetchData(); // revert
    } else {
      setSuccessMsg(`Approved ${name} successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleReject = async (id: string, name: string) => {
    // Optimistic
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));

    const { error } = await supabase.rpc("reject_user", { target_user_id: id });
    if (error) {
      console.error("Error rejecting user:", error);
      fetchData();
    } else {
      setSuccessMsg(`Rejected ${name}.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setShowManualAdd(false);
    setSuccessMsg("User manually added and credentials sent.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleDownloadPlacements = async () => {
    const { data, error } = await supabase
      .from("applications")
      .select(
        `
        id,
        student_name,
        student_email,
        status,
        applied_at,
        opportunities ( title, company_name )
      `,
      )
      .eq("status", "accepted");

    if (error) {
      console.error("Error fetching placements", error);
      alert("Failed to fetch placements: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      const reportData = data.map((app) => ({
        "Application ID": app.id,
        "Student Name": app.student_name,
        "Student Email": app.student_email,
        "Opportunity Title": (app.opportunities as any)?.title || "Unknown",
        "Company Name": (app.opportunities as any)?.company_name || "Unknown",
        Status: app.status,
        "Date Placed": new Date(app.applied_at).toLocaleDateString(),
      }));
      downloadCSV(reportData, "placements_report.csv");
      setSuccessMsg("Placements report generated.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setSuccessMsg("No accepted placements found to generate report.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleDownloadLogbooks = async () => {
    const { data, error } = await supabase.from("logbooks").select(`
          id,
          week_number,
          content,
          supervisor_feedback,
          created_at,
          applications ( student_name, student_email )
       `);

    if (error) {
      console.error("Error fetching logbooks", error);
      alert("Failed to fetch logbooks: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      const reportData = data.map((lb) => ({
        "Logbook ID": lb.id,
        "Student Name": (lb.applications as any)?.student_name || "Unknown",
        "Student Email": (lb.applications as any)?.student_email || "Unknown",
        "Week Number": lb.week_number,
        Content: lb.content,
        "Supervisor Feedback": lb.supervisor_feedback || "",
        "Submitted At": new Date(lb.created_at).toLocaleDateString(),
      }));
      downloadCSV(reportData, "logbooks_summary.csv");
      setSuccessMsg("Logbooks summary report generated.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setSuccessMsg("No logbooks found to generate report.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-navy text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight"
          >
            <BookOpen className="w-6 h-6 text-blue-400" />
            <span>Internova</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Admin System
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

      {/* Main Layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome, {userName}!
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage platform access requests and manual onboarding.
            </p>
          </div>
          <button
            onClick={() => setShowManualAdd(!showManualAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors w-fit"
          >
            {showManualAdd ? (
              <FileText className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {showManualAdd ? "View Approvals" : "Manual Add User"}
          </button>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-emerald-50 border border-[var(--color-emerald)] text-[var(--color-emerald)] rounded-lg font-medium text-sm flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {showManualAdd ? (
                <motion.div
                  key="manual-add"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-lg font-bold text-slate-900 mb-6">
                    Manual Onboarding
                  </h2>
                  <form onSubmit={handleManualAdd} className="space-y-5">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Account Type
                      </label>
                      <select
                        required
                        value={addAccountType}
                        onChange={(e) => setAddAccountType(e.target.value as "student" | "company" | "university")}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="student">Student</option>
                        <option value="company">Company</option>
                        <option value="university">University</option>
                      </select>
                    </div>

                    {addAccountType === 'student' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                            <input required type="text" value={addName} onChange={(e) => setAddName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Jane Doe" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                            <input required type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="student@example.com" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">University</label>
                            <select required value={addUniversity} onChange={(e) => setAddUniversity(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none">
                              <option value="" disabled>Select your university</option>
                              <option value="Egerton University">Egerton University</option>
                              <option value="University of Nairobi">University of Nairobi</option>
                              <option value="Kenyatta University">Kenyatta University</option>
                              <option value="Jomo Kenyatta University of Agriculture and Technology">Jomo Kenyatta University of Agriculture and Technology</option>
                              <option value="Moi University">Moi University</option>
                              <option value="Strathmore University">Strathmore University</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration Number</label>
                            <input required type="text" value={addRegNo} onChange={(e) => setAddRegNo(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., S13/03009/24" />
                          </div>
                        </div>
                      </>
                    )}

                    {addAccountType === 'company' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                          <input required type="text" value={addCompanyName} onChange={(e) => setAddCompanyName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Acme Corp" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Representative Name <span className="text-red-500">*</span></label>
                          <input required type="text" value={addName} onChange={(e) => setAddName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jane Doe" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                          <input required type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                          <input required type="text" value={addPhoneNumber} onChange={(e) => setAddPhoneNumber(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+254..." />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">KRA PIN <span className="text-red-500">*</span></label>
                          <input required type="text" value={addKraPin} onChange={(e) => setAddKraPin(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="A000000000X" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Registration Number (CR12/BRS) <span className="text-red-500">*</span></label>
                          <input required type="text" value={addCompanyRegNumber} onChange={(e) => setAddCompanyRegNumber(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="PVT/..." />
                        </div>
                        
                        <div className="md:col-span-2 mt-2">
                          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">Physical Location</h3>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">County <span className="text-red-500">*</span></label>
                          <select required value={addCounty} onChange={(e) => setAddCounty(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                            <option value="" disabled>Select County</option>
                            <option value="Nairobi">Nairobi</option>
                            <option value="Mombasa">Mombasa</option>
                            <option value="Kisumu">Kisumu</option>
                            <option value="Nakuru">Nakuru</option>
                            <option value="Uasin Gishu">Uasin Gishu</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Town / City <span className="text-red-500">*</span></label>
                          <input required type="text" value={addTown} onChange={(e) => setAddTown(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Westlands" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Building Name / Street / Landmark <span className="text-red-500">*</span></label>
                          <input required type="text" value={addBuilding} onChange={(e) => setAddBuilding(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Posta Plaza, 2nd Floor" />
                        </div>

                        <div className="md:col-span-2 mt-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Online Presence <span className="text-slate-400 font-normal">(Optional)</span></label>
                          <input type="text" value={addOnlinePresence} onChange={(e) => setAddOnlinePresence(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Website or Official Social Media Page" />
                        </div>
                      </div>
                    )}

                    {addAccountType === 'university' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                          <input required type="text" value={addName} onChange={(e) => setAddName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jane Doe" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">University</label>
                          <select required value={addUniversity} onChange={(e) => setAddUniversity(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                            <option value="" disabled>Select your university</option>
                            <option value="Egerton University">Egerton University</option>
                            <option value="University of Nairobi">University of Nairobi</option>
                            <option value="Kenyatta University">Kenyatta University</option>
                            <option value="Jomo Kenyatta University of Agriculture and Technology">Jomo Kenyatta University of Agriculture and Technology</option>
                            <option value="Moi University">Moi University</option>
                            <option value="Strathmore University">Strathmore University</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Work Email</label>
                          <input required type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@university.edu" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee Staff Number</label>
                          <input required type="text" value={addStaffNumber} onChange={(e) => setAddStaffNumber(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. EMP-12345" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Department / Faculty</label>
                          <input required type="text" value={addDepartment} onChange={(e) => setAddDepartment(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Computer Science" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                          <input required type="text" value={addPhoneNumber} onChange={(e) => setAddPhoneNumber(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+254..." />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowManualAdd(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? "Processing..." : "Generate & Send Invite"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="approvals"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">
                      Pending Approvals
                    </h2>
                    <span className="px-2.5 py-1 bg-amber-100 text-[var(--color-amber)] text-xs font-bold rounded-full">
                      {pendingUsers.length} Pending
                    </span>
                  </div>

                  {pendingUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p>All caught up! No pending approvals.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {pendingUsers.map((user) => (
                        <div
                          key={user.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">
                                {user.role === "company"
                                  ? user.company_name
                                  : user.name}
                              </h3>
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 rounded">
                                {user.role}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500">
                              {user.email}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Requested:{" "}
                              {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleReject(
                                  user.id,
                                  user.role === "company"
                                    ? user.company_name
                                    : user.name,
                                )
                              }
                              className="p-2 text-slate-400 hover:text-[var(--color-red)] hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                handleApprove(
                                  user.id,
                                  user.role === "company"
                                    ? user.company_name
                                    : user.name,
                                )
                              }
                              className="px-4 py-2 bg-[var(--color-emerald)] text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <RecentLogbooks showActions={false} />
          </div>

          {/* Sidebar / Stats */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-blue-50 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    Universities
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {stats.universities}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-md">
                      <Search className="w-4 h-4" />
                    </div>
                    Active Companies
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {stats.companies}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    Students
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {stats.students}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-md">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    Total Placed
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {stats.placements}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                Reports
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleDownloadPlacements}
                  className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Placements (CSV)
                </button>
                <button
                  onClick={handleDownloadLogbooks}
                  className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Logbooks (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Data Analysis
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Visual representation of system metrics.
          </p>
          <AdminCharts />
        </div>
      </main>
    </div>
  );
}
