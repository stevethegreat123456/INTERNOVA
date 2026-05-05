import React, { useState } from 'react';
import { BookOpen, GraduationCap, Landmark, Building2, UserCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

const roleDetails = {
  student: { title: 'Student Portal', icon: GraduationCap },
  company: { title: 'Company Portal', icon: Building2 },
  supervisor: { title: 'University Portal', icon: UserCheck },
  admin: { title: 'Admin Portal', icon: ShieldCheck },
};

type RoleKey = keyof typeof roleDetails;

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawRole = searchParams.get('role');
  const role: RoleKey = (rawRole && roleDetails[rawRole as RoleKey]) ? (rawRole as RoleKey) : 'student';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const authEmail = email;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError) {
        setErrorMsg('Invalid credentials. Please check your details and try again.');
        setIsSubmitting(false);
        return;
      }

      // Check if user has corresponding role via user metadata
      if (data.user?.user_metadata?.role && data.user.user_metadata.role !== role) {
        const correctRole = data.user.user_metadata.role as RoleKey;
        setErrorMsg(`You are trying to log in to the ${roleDetails[role].title} using an account meant for ${roleDetails[correctRole]?.title || correctRole}.`);
        await supabase.auth.signOut();
        setIsSubmitting(false);
        return;
      }

      // Check if user is approved
      if ((role === 'company' || role === 'admin') && data.user?.user_metadata?.approved === false) {
        setErrorMsg('Your account is pending administrator approval.');
        await supabase.auth.signOut();
        setIsSubmitting(false);
        return;
      }

      // Successful login
      setErrorMsg("Logged in successfully! Redirecting...");
      setTimeout(() => {
        if (role === 'admin') {
          navigate('/admin/dashboard');
        } else if (role === 'student') {
          navigate('/student/dashboard');
        } else if (role === 'company') {
          navigate('/company/dashboard');
        } else if (role === 'supervisor') {
          navigate('/supervisor/dashboard');
        } else {
          navigate('/');
        }
      }, 1000);

    } catch (err: any) {
      setErrorMsg("Our campus servers are taking a break, please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Icon = roleDetails[role].icon;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      <header className="px-6 py-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-navy w-fit">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <span>Internova</span>
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Icon className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-navy">Welcome Back</h1>
            <p className="text-sm text-slate-500 mt-2 text-center">
              Log in to your {roleDetails[role].title} account
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 text-[var(--color-red)] text-sm font-medium rounded-lg border border-red-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-navy text-white font-medium text-sm py-2.5 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to={`/signup?role=${role}`} className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
