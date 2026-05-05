import React, { useEffect, useState } from 'react';
import { BookOpen, UserCheck, ArrowLeft, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Logbook {
  id: string;
  application_id: string;
  student_id: string;
  week_number: number;
  content: string;
  supervisor_feedback: string | null;
  created_at: string;
}

export default function SupervisorLogbooksPage() {
  const [logbooks, setLogbooks] = useState<Logbook[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, [navigate]);

  const fetchStudents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login?role=supervisor');
      return;
    }

    // Get supervisor's profile to know university
    const { data: supProfile } = await supabase.from('profiles').select('university').eq('id', user.id).single();
    if (!supProfile) return;

    // Get all students from this university who have accepted applications
    // In a real app we would join more complexly, but since we're using Supabase RPC or just filtering:
    const { data: studentProfiles } = await supabase
       .from('profiles')
       .select('id, name, reg_no')
       .eq('university', supProfile.university)
       .eq('role', 'student');
       
    if (studentProfiles && studentProfiles.length > 0) {
        setStudents(studentProfiles);
        setSelectedStudent(studentProfiles[0].id);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchLogbooks();
    }
  }, [selectedStudent]);

  const fetchLogbooks = async () => {
    const { data } = await supabase
      .from('logbooks')
      .select('*, profiles!student_id(name)')
      .eq('student_id', selectedStudent)
      .order('week_number', { ascending: false });
    if (data) setLogbooks(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const submitFeedback = async (logbookId: string, feedback: string) => {
     setIsSubmittingFeedback(logbookId);
     const { error } = await supabase.from('logbooks').update({ supervisor_feedback: feedback }).eq('id', logbookId);
     setIsSubmittingFeedback(null);
     if (error) {
         alert("Failed to submit feedback: " + error.message);
     } else {
         fetchLogbooks(); // refresh
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-navy text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <BookOpen className="w-6 h-6 text-blue-400" />
              <span>Internova</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium border-l border-white/20 pl-6">
              <Link to="/supervisor/dashboard" className="text-slate-300 hover:text-white">Dashboard</Link>
              <Link to="/supervisor/logbooks" className="text-white">Logbooks</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to="/supervisor/settings" className="text-slate-300 hover:text-white transition-colors">Settings</Link>
            <div className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/20">
              <UserCheck className="w-4 h-4" />
              University Portal
            </div>
            <button className="text-slate-300 hover:text-white transition-colors" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
           <Link to="/supervisor/dashboard" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
           </Link>
           <div>
              <h1 className="text-2xl font-bold text-slate-900">Student Logbooks</h1>
              <p className="text-sm text-slate-500 mt-1">Review student progress and provide feedback.</p>
           </div>
        </div>

        {students.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-500">
             No students found in your university.
          </div>
        ) : (
           <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Select Student</label>
                  <select 
                     value={selectedStudent} 
                     onChange={(e) => setSelectedStudent(e.target.value)}
                     className="w-full max-w-md px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                     {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.reg_no})</option>
                     ))}
                  </select>
              </div>

              <div className="space-y-6">
                 {logbooks.length === 0 ? (
                    <p className="text-slate-500 text-sm">No logbook entries found for this student.</p>
                 ) : (
                    logbooks.map(log => (
                       <LogbookEntry 
                          key={log.id} 
                          log={log} 
                          onSubmitFeedback={(text) => submitFeedback(log.id, text)}
                          isSubmitting={isSubmittingFeedback === log.id}
                       />
                    ))
                 )}
              </div>
           </div>
        )}
      </main>
    </div>
  );
}

const LogbookEntry: React.FC<{ log: Logbook, onSubmitFeedback: (text: string) => void, isSubmitting: boolean }> = ({ log, onSubmitFeedback, isSubmitting }) => {
    const [feedback, setFeedback] = useState(log.supervisor_feedback || '');
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
           <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
               <div>
                   <h3 className="font-bold text-slate-900 text-lg">Week {log.week_number}</h3>
                   <span className="text-xs text-slate-500 font-medium">{new Date(log.created_at).toLocaleDateString()}</span>
               </div>
           </div>
           
           <div className="mb-6">
               <h4 className="text-sm font-bold text-slate-900 mb-2">Student's Progress</h4>
               <p className="text-slate-700 text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
                   {log.content}
               </p>
           </div>

           <div>
               <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                   <MessageSquare className="w-4 h-4" /> Supervisor Feedback
               </h4>
               {log.supervisor_feedback && !isEditing ? (
                   <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                       <p className="text-slate-700 text-sm whitespace-pre-wrap">{log.supervisor_feedback}</p>
                       <button 
                           onClick={() => setIsEditing(true)} 
                           className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider">
                           Edit Feedback
                       </button>
                   </div>
               ) : (
                   <div className="space-y-3">
                       <textarea 
                           rows={3} 
                           value={feedback} 
                           onChange={(e) => setFeedback(e.target.value)}
                           placeholder="Provide constructive feedback..."
                           className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                       />
                       <div className="flex gap-2">
                           <button 
                               onClick={() => { onSubmitFeedback(feedback); setIsEditing(false); }}
                               disabled={isSubmitting}
                               className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                               {isSubmitting ? 'Saving...' : (log.supervisor_feedback ? 'Update Feedback' : 'Submit Feedback')}
                           </button>
                           {isEditing && (
                               <button 
                                   onClick={() => { setFeedback(log.supervisor_feedback || ''); setIsEditing(false); }}
                                   className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
                                   Cancel
                               </button>
                           )}
                       </div>
                   </div>
               )}
           </div>
       </div>
    );
}
