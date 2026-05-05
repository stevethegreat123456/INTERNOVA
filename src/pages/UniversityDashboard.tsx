/**
 * @module UniversityDashboard
 * @description Supervisor portal for monitoring student attachments. Functions:
 * - Listing all students registered under the supervisor's university.
 * - Calculating statistics such as total assigned students and pending logbooks.
 * - Generating filtered CSV reports specific to the university's cohort.
 * - Providing entry points to review and grade individual student logbooks.
 */
import { useEffect, useState } from "react";
import { BookOpen, UserCheck, FileText, Users, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { downloadCSV } from "../utils/csvExport";
import AdminCharts from "../components/AdminCharts";
import RecentLogbooks from "../components/RecentLogbooks";

export default function UniversityDashboard() {
  const [userName, setUserName] = useState<string>("Supervisor");
  const [university, setUniversity] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    logbooksPending: 0,
    totalPlaced: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login?role=supervisor");
        return;
      }
      if (user.user_metadata?.name) {
        setUserName(user.user_metadata.name);
      }

      // Get profile
      const { data: supProfile } = await supabase
        .from("profiles")
        .select("university")
        .eq("id", user.id)
        .single();
      if (supProfile) {
        setUniversity(supProfile.university);
        fetchData(supProfile.university);
      }
    };
    fetchUser();
  }, [navigate]);

  const fetchData = async (uni: string) => {
    // Fetch students from this university
    const { data: studentProfiles } = await supabase
      .from("profiles")
      .select("id, name, reg_no")
      .eq("university", uni)
      .eq("role", "student");

    if (studentProfiles && studentProfiles.length > 0) {
      setStudents(studentProfiles);

      const studentIds = studentProfiles.map((s) => s.id);

      const { count: pendingCount } = await supabase
        .from("logbooks")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .or("supervisor_feedback.is.null,supervisor_feedback.eq.");

      const { count: placedCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("status", "accepted");

      setStats({
        totalAssigned: studentProfiles.length,
        logbooksPending: pendingCount || 0,
        totalPlaced: placedCount || 0,
      });
    } else {
      setStats({ totalAssigned: 0, logbooksPending: 0, totalPlaced: 0 });
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

  const handleDownloadPlacements = async () => {
    if (!students.length) {
      alert("No students found in your university.");
      return;
    }

    const studentIds = students.map((s) => s.id);

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
      .in("student_id", studentIds)
      .eq("status", "accepted");

    if (error) {
      alert("Failed to fetch placements: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      const reportData = data.map((app) => ({
        "Application ID": app.id,
        "Student Name": app.student_name,
        "Student Email": app.student_email,
        "Opportunity Title": (app.opportunities as any)?.title || "Unknown",
        Company: (app.opportunities as any)?.company_name || "Unknown",
        Status: app.status,
        "Date Placed": new Date(app.applied_at).toLocaleDateString(),
      }));
      downloadCSV(
        reportData,
        `${university.replace(/\s+/g, "_")}_placements.csv`,
      );
    } else {
      alert("No accepted placements found for your students.");
    }
  };

  const handleDownloadLogbooks = async () => {
    if (!students.length) {
      alert("No students found in your university.");
      return;
    }

    const studentIds = students.map((s) => s.id);

    const { data, error } = await supabase
      .from("logbooks")
      .select(
        `
          id,
          week_number,
          content,
          supervisor_feedback,
          created_at,
          applications ( student_name, student_email )
       `,
      )
      .in("student_id", studentIds);

    if (error) {
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
      downloadCSV(
        reportData,
        `${university.replace(/\s+/g, "_")}_logbooks.csv`,
      );
    } else {
      alert("No logbooks found for your students.");
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
              <Link to="/supervisor/dashboard" className="text-white">
                Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link
              to="/supervisor/settings"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Settings
            </Link>
            <div className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/20">
              <UserCheck className="w-4 h-4" />
              University Portal
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

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {userName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review logbooks and track student progress.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">
                Assigned Students
              </h2>
              <div className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <p className="py-4 text-slate-500">
                    No students are currently registered under your university.
                  </p>
                ) : (
                  students.map((student, i) => (
                    <div
                      key={student.id}
                      className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {student.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            Reg: {student.reg_no}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("/supervisor/logbooks")}
                        className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> View Logbooks
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <RecentLogbooks universityMode={true} universityName={university} />
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-blue-50 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                Quick Stats
              </h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
                      <Users className="w-4 h-4" />
                    </div>
                    Total Assigned
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {stats.totalAssigned}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    Total Placed
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {stats.totalPlaced}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-md">
                      <FileText className="w-4 h-4" />
                    </div>
                    Pending Review
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {stats.logbooksPending}
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
                  My Students Placements (CSV)
                </button>
                <button
                  onClick={handleDownloadLogbooks}
                  className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Students Logbooks (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>

        {university && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Student Deployment Analysis
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Application and placement statistics for {university}.
            </p>
            <AdminCharts universityMode={true} universityName={university} />
          </div>
        )}
      </main>
    </div>
  );
}
