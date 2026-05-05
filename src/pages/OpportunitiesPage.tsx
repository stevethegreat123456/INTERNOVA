import React, { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, Search, CheckCircle, ArrowLeft, Upload, XCircle, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Opportunity, Application } from '../lib/mockDb'; // Keep using interfaces from here for now

export default function OpportunitiesPage() {
  const [userName, setUserName] = useState<string>('Student');
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login?role=student');
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || '');
      if (user.user_metadata?.name) {
        setUserName(user.user_metadata.name);
      }
      
      const [oppsResult, appsResult] = await Promise.all([
        supabase.from('opportunities').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('*').eq('student_id', user.id)
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
          appliedAt: a.applied_at
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handleApply = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setCvFile(null);
    setUploadError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) {
      setCvFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 5MB.');
      setCvFile(null);
      return;
    }

    const permittedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!permittedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Only PDF and DOC/DOCX files are allowed.');
      setCvFile(null);
      return;
    }
    setCvFile(file);
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp || !cvFile) return;

    setIsSubmitting(true);

    try {
      // 1. Upload CV to storage
      const fileExt = cvFile.name.split('.').pop();
      const fileName = `${userId}_${selectedOpp.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; 
      
      let cvUrl = null;
      
      const { error: storageError } = await supabase.storage
        .from('cvs')
        .upload(filePath, cvFile);
        
      if (storageError) {
        throw new Error('Failed to upload CV. Make sure you ran the storage setup script! ' + storageError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('cvs')
          .getPublicUrl(filePath);
        cvUrl = publicUrlData.publicUrl;
      }

      // Optimistic update
      const tempId = Math.random().toString(36).substring(2, 9);
      const newApp: Application = {
        id: tempId,
        opportunityId: selectedOpp.id,
        studentId: userId,
        studentName: userName,
        studentEmail: userEmail,
        cvUrl: cvUrl,
        status: 'pending',
        appliedAt: new Date().toISOString()
      };
      setMyApplications([...myApplications, newApp]);

      const { data, error } = await supabase.from('applications').insert({
        opportunity_id: selectedOpp.id,
        student_id: userId,
        student_name: userName,
        student_email: userEmail,
        status: 'pending',
        cv_url: cvUrl
      }).select().single();
      
      // If successful, update with real ID
      if (data && !error) {
         setMyApplications(prev => prev.map(a => a.id === tempId ? {
            ...data,
            opportunityId: data.opportunity_id,
            studentId: data.student_id,
            studentName: data.student_name,
            studentEmail: data.student_email,
            cvUrl: data.cv_url,
            appliedAt: data.applied_at
         } : a));
      } else {
         // Revert optimistic update on error
         setMyApplications(prev => prev.filter(a => a.id !== tempId));
         console.error("Failed to apply", error);
         alert("Failed to apply: " + error?.message);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
      setSelectedOpp(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate('/');
    }
  };

  const filteredOpps = opportunities.filter(o => {
    const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // tags is an array, let's allow searching in tags if available or match title
    const oTags = Array.isArray(o.tags) ? o.tags.map(t => typeof t === 'string' ? t.toLowerCase() : '') : [];
    const matchesTag = tagFilter === '' || oTags.some(t => t.includes(tagFilter.toLowerCase()));
    
    const oLocation = o.location ? o.location.toLowerCase() : '';
    const matchesLocation = locationFilter === '' || oLocation.includes(locationFilter.toLowerCase());

    const matchesPaid = paidFilter === 'all' || 
                       (paidFilter === 'paid' && o.is_paid === true) || 
                       (paidFilter === 'unpaid' && o.is_paid === false);

    return matchesSearch && matchesTag && matchesLocation && matchesPaid;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-navy text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <span>Internova</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to="/student/dashboard" className="px-3 py-1 bg-white/10 rounded-full flex items-center gap-2 border border-white/20 hover:bg-white/20 transition-colors">
              <GraduationCap className="w-4 h-4" />
              Dashboard
            </Link>
            <button className="text-slate-300 hover:text-white transition-colors" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link to="/student/dashboard" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Browse Opportunities</h1>
            <p className="text-sm text-slate-500 mt-1">Find and apply to the best internships.</p>
          </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by title or company..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-8 flex flex-col sm:flex-row gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Filter by Tag</label>
              <input 
                type="text" 
                placeholder="e.g. Frontend, Finance" 
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Filter by Location</label>
              <input 
                type="text" 
                placeholder="e.g. Remote, Nairobi" 
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Payment Type</label>
              <select 
                value={paidFilter}
                onChange={e => setPaidFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Opportunities</option>
                <option value="paid">Paid Only</option>
                <option value="unpaid">Unpaid Only</option>
              </select>
            </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpps.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-slate-500 border border-slate-200 border-dashed rounded-xl">
              No opportunities found.
            </div>
          ) : filteredOpps.map(opp => {
            const hasApplied = myApplications.some(a => a.opportunityId === opp.id);
            return (
              <div key={opp.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 text-lg">{opp.title}</h3>
                    {opp.is_paid ? (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold whitespace-nowrap ml-2">Paid</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold whitespace-nowrap ml-2">Unpaid</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 font-medium mb-3">{opp.companyName} • {opp.location}</p>
                  
                  {opp.tags && Array.isArray(opp.tags) && opp.tags.length > 0 && (
                     <div className="flex flex-wrap gap-1 mb-4">
                        {opp.tags.map(t => (
                           <span key={t} className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-md font-medium">{t}</span>
                        ))}
                     </div>
                  )}
                  
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">{opp.description}</p>
                  
                  {opp.requirements && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase mb-1">Requirements</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{opp.requirements}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                  {hasApplied ? (
                    <button disabled className="w-full py-2 bg-slate-100 text-slate-400 font-medium rounded-lg text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                      <CheckCircle className="w-4 h-4" /> Applied
                    </button>
                  ) : (
                    <button id={`btn-apply-${opp.id}`} onClick={() => handleApply(opp)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors">
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Application Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Apply: {selectedOpp.title}</h3>
              <button disabled={isSubmitting} onClick={() => setSelectedOpp(null)} className="text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer disabled:opacity-50">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitApplication} className="p-6">
              <div className="mb-4 text-sm text-slate-600">
                <p>You are applying to <strong>{selectedOpp.companyName}</strong>.</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload your CV</label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group hover:border-blue-300 transition-colors">
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    required
                    disabled={isSubmitting}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleFileChange}
                  />
                  {cvFile ? (
                    <div className="text-center">
                      <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{cvFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{(cvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                      <p className="text-sm font-medium text-blue-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX (Max 5MB)</p>
                    </div>
                  )}
                </div>
                {uploadError && <p className="text-sm text-red-600 mt-2 font-medium">{uploadError}</p>}
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button type="button" disabled={isSubmitting} onClick={() => setSelectedOpp(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting || !cvFile} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
