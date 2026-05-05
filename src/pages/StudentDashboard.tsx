/**
 * @module StudentDashboard
 * @description Serves as the primary portal for student users. This module handles:
 * - Fetching and displaying the student's current internship applications and their statuses.
 * - Providing quick statistics on applications and available logbooks.
 * - Offering navigation to browse new opportunities and submit weekly logbooks.
 * 
 * It interacts with the 'applications' and 'logbooks' tables via Supabase to provide
 * a centralized view of the student's internship lifecycle.
 */
import React, { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, FileText, CheckCircle, Clock, Search, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Opportunity, Application } from '../lib/mockDb';

export default function StudentDashboard() {
  const [userName, setUserName] = useState<string>('Student');
  const [userId, setUserId] = useState<string>('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [myApplications, setMyApplications] = useState<(Application & { opportunityTitle?: string; companyName?: string })[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login?role=student');
        return;
      }
      setUserId(user.id);
      if (user.user_metadata?.name) {
        setUserName(user.user_metadata.name);
      }
      
      const [oppsResult, appsResult] = await Promise.all([
        supabase.from('opportunities').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('applications').select('*, opportunities(*)').eq('student_id', user.id)
      ]);
      
      if (oppsResult.data) {
        setOpportunities(oppsResult.data.map(o => ({
          ...o,
          companyId: o.company_id,
          companyName: o.company_name,
          createdAt: o.created_at
        })));
      }
      
      if (appsResult.data) {
        setMyApplications(appsResult.data.map(a => ({
          ...a,
          opportunityId: a.opportunity_id,
          studentId: a.student_id,
          studentName: a.student_name,
          studentEmail: a.student_email,
          appliedAt: a.applied_at,
          opportunityTitle: a.opportunities?.title,
          companyName: a.opportunities?.company_name,
        })));
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-navy text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <span>Internova</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <div className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/20">
              <GraduationCap className="w-4 h-4" />
              Student Portal
            </div>
            <button className="text-slate-300 hover:text-white transition-colors" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {userName}!</h1>
          <p className="text-sm text-slate-500 mt-1">Here is a quick overview of your internship progress.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-lg font-bold text-slate-900">Recent Opportunities</h2>
                <Link to="/student/opportunities" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  Browse All <Search className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="space-y-4">
                {opportunities.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
                    No active opportunities right now. Check back later!
                  </div>
                ) : opportunities.map((opp) => (
                  <div key={opp.id} className="p-4 border border-slate-100 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-200 transition-colors">
                    <div>
                      <h3 className="font-bold text-slate-800">{opp.title}</h3>
                      <p className="text-sm text-slate-500">{opp.companyName} • {opp.location}</p>
                    </div>
                    <Link to="/student/opportunities" className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">Logbook Entries</h2>
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>No logbook entries yet. Once your internship starts, you can add them here.</p>
                <button onClick={() => navigate('/student/logbooks')} className="mt-4 px-4 py-2 bg-[var(--color-emerald)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90">
                  New Entry
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">My Applications</h3>
              <div className="space-y-4">
                {myApplications.length === 0 ? (
                  <p className="text-sm text-slate-500">You haven't applied to any opportunities yet.</p>
                ) : (
                  myApplications.map(app => (
                    <div key={app.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                      <p className="font-semibold text-slate-800 text-sm mb-1">{app.opportunityTitle || 'Unknown Opportunity'}</p>
                      <p className="text-xs text-slate-500 mb-2">{app.companyName || 'Unknown Company'}</p>
                      <div className="flex items-center gap-1.5 align-middle">
                        {app.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        {app.status === 'accepted' && <CheckCircle className="w-3.5 h-3.5 text-[var(--color-emerald)]" />}
                        {app.status === 'shortlisted' && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
                        {app.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          app.status === 'accepted' ? 'text-[var(--color-emerald)]' :
                          app.status === 'rejected' ? 'text-red-600' :
                          app.status === 'shortlisted' ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
