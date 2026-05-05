import React, { useEffect, useState } from 'react';
import { BookOpen, User, Settings, Save, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProfileSettingsPage({ userRole }: { userRole: 'student' | 'company' | 'supervisor' }) {
  const [profile, setProfile] = useState<any>(null);
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [aboutUs, setAboutUs] = useState('');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setProfile(data);
      setName(data.name || '');
      setBio(data.bio || '');
      setSkills(data.skills || '');
      setAboutUs(data.about_us || '');
      setLogoUrl(data.logo_url || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates: any = {
      name,
    };

    if (userRole === 'student') {
      updates.bio = bio;
      updates.skills = skills;
    } else if (userRole === 'company') {
      updates.about_us = aboutUs;
      updates.logo_url = logoUrl;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    
    setIsSaving(false);
    if (error) {
      setMessage('Error saving profile: ' + error.message);
    } else {
      setMessage('Profile saved successfully!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
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
              <Link to={`/${userRole}/dashboard`} className="text-slate-300 hover:text-white">Dashboard</Link>
              {userRole === 'student' && <Link to="/student/opportunities" className="text-slate-300 hover:text-white">Opportunities</Link>}
              {userRole === 'student' && <Link to="/student/logbooks" className="text-slate-300 hover:text-white">Logbooks</Link>}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to={`/${userRole}/settings`} className="text-white">Settings</Link>
            <button className="text-slate-300 hover:text-white transition-colors" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-3xl w-full mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
           <Link to={`/${userRole}/dashboard`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
           </Link>
           <div>
              <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
              <p className="text-sm text-slate-500 mt-1">Manage your account information</p>
           </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
           <form onSubmit={handleSave} className="space-y-6">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    <User className="w-4 h-4" /> Full Name
                 </label>
                 <input 
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                 />
              </div>

              {userRole === 'student' && (
                 <>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
                       <textarea 
                          rows={4} value={bio} onChange={e => setBio(e.target.value)}
                          placeholder="Tell us a little about yourself..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Skills (comma separated)</label>
                       <input 
                          type="text" value={skills} onChange={e => setSkills(e.target.value)}
                          placeholder="React, Python, Data Analysis..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                       />
                    </div>
                 </>
              )}

              {userRole === 'company' && (
                 <>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">About Us</label>
                       <textarea 
                          rows={6} value={aboutUs} onChange={e => setAboutUs(e.target.value)}
                          placeholder="What does your company do?"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo URL</label>
                       <input 
                          type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                       />
                    </div>
                 </>
              )}

              {message && (
                 <div className={`p-4 rounded-lg text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-[var(--color-emerald)]'}`}>
                    {message}
                 </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                 <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2">
                    <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Profile'}
                 </button>
              </div>
           </form>
        </div>
      </main>
    </div>
  );
}
