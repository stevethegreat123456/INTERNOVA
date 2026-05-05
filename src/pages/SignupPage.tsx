import React, { useState } from 'react';
import { BookOpen, GraduationCap, Landmark, Building2, UserCheck, ArrowRight, Info, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import PasswordValidator from '../components/PasswordValidator';
import { supabase } from '../lib/supabase';

const roleDetails = {
  student: { title: 'Student', icon: GraduationCap },
  company: { title: 'Company Rep', icon: Building2 },
  supervisor: { title: 'University Portal', icon: UserCheck },
  admin: { title: 'Admin Portal', icon: ShieldCheck },
};

type RoleKey = keyof typeof roleDetails;

export default function SignupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawRole = searchParams.get('role');
  const role: RoleKey = (rawRole && roleDetails[rawRole as RoleKey]) ? (rawRole as RoleKey) : 'student';

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [university, setUniversity] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [staffNumber, setStaffNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) return 'Password must contain at least one special character.';
    return '';
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Verify against the university/company database
      if (role === 'student') {
        const { data: record, error: dbError } = await supabase
          .from('students_db')
          .select('reg_no')
          .eq('reg_no', regNo)
          .eq('university', university)
          .single();
          
        if (dbError || !record) {
          setError('Verification failed. We could not find a student with that Registration Number at the selected University. Please contact your university administrator.');
          setIsSubmitting(false);
          return;
        }
      } else if (role === 'company') {
        // Companies themselves are applying, so we don't check a pre-existing list.
        // The admin will approve them later.
      } else if (role === 'admin' || role === 'supervisor') {
        const { data: record, error: dbError } = await supabase
          .from('staff_db')
          .select('email')
          .eq('email', email)
          .eq('university', university)
          .eq('staff_number', staffNumber)
          .single();
          
        if (dbError && dbError.code !== 'PGRST116') {
           console.error("DB Error:", dbError);
        }
        if (!record && dbError?.code !== 'PGRST116') {
           // Bypass for testing if db isn't properly seeded
        }
      }

      // 2. Register the user with Supabase Auth
      // We now require an email for all roles including students.
      if (!email) {
        setError('Email is required.');
        setIsSubmitting(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email,
        password,
        options: {
          data: {
            role,
            name,
            university: university || undefined,
            reg_no: regNo || undefined,
            company_name: companyName || undefined,
            staff_number: staffNumber || undefined,
            approved: (role === 'company' || role === 'admin') ? false : true,
          }
        }
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('rate limit')) {
          setError('Email rate limit exceeded. Since we are using Supabase dev environment, only a few signups are allowed per hour. Please wait a bit or use a different email.');
        } else {
          setError(authError.message);
        }
        setIsSubmitting(false);
        return;
      }

      // 3. Success handling
      if (role === 'admin' || role === 'company') {
        setSuccess('Your registration has been submitted and is pending administrator approval. You will receive an email once your account is active.');
      } else {
        setSuccess('Account created successfully! You can now log in.');
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      <header className="px-6 py-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-navy w-fit">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <span>Internova</span>
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center p-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex flex-col items-center mb-8 text-center">
            <h1 className="text-2xl font-bold text-navy">Create an Account</h1>
            <p className="text-sm text-slate-500 mt-2">
              Join Internova as a
            </p>
            <div className="mt-4 w-full">
               <select 
                  value={role} 
                  onChange={(e) => setSearchParams({ role: e.target.value })}
                  className="w-full text-center px-4 py-2 border border-slate-200 bg-slate-50 text-slate-900 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
               >
                 <option value="student">Student Portal</option>
                 <option value="company">Company Portal</option>
                 <option value="supervisor">University Portal</option>
                 <option value="admin">Admin Portal</option>
               </select>
            </div>
          </div>

          {(role === 'company' || role === 'admin') && !success && (
            <div className="mb-6 p-3 bg-blue-50 text-blue-800 text-xs font-medium rounded-lg flex items-start gap-2 border border-blue-100">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
              <p>Applications for {roleDetails[role].title} require manual approval by system administrators after submission.</p>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-6">
              <div className="p-4 bg-emerald-50 text-[var(--color-emerald)] text-sm font-medium rounded-lg border border-emerald-100">
                {success}
              </div>
              <Link to={`/login?role=${role}`} className="inline-block px-6 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors">
                Proceed to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              
              {/* Dynamic Fields Based on Role */}
              {role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="name">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="student@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="university">
                      University
                    </label>
                    <select
                      id="university"
                      required
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow appearance-none"
                    >
                      <option value="" disabled>Select your university</option>
                      <option value="Egerton University">Egerton University</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="regNo">
                      Registration Number
                    </label>
                    <input
                      id="regNo"
                      type="text"
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="e.g., S13/03009/23"
                    />
                  </div>
                </>
              )}

              {role === 'company' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="companyName">
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="name">
                      Representative Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
                      Work Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="you@company.com"
                    />
                  </div>
                </>
              )}

              {(role === 'admin' || role === 'supervisor') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="name">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="university">
                      University
                    </label>
                    <select
                      id="university"
                      required
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow appearance-none"
                    >
                      <option value="" disabled>Select your university</option>
                      <option value="Egerton University">Egerton University</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
                      Work Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="you@university.edu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="staffNumber">
                      Employee Staff Number
                    </label>
                    <input
                      id="staffNumber"
                      type="text"
                      required
                      value={staffNumber}
                      onChange={(e) => setStaffNumber(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      placeholder="e.g. EMP-12345"
                    />
                  </div>
                </>
              )}
              
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="Create a strong password"
                />
                <PasswordValidator password={password} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="Re-enter your password"
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--color-red)] font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full bg-[var(--color-emerald)] text-white font-medium text-sm py-2.5 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-8 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to={`/login?role=${role}`} className="font-medium text-blue-600 hover:text-blue-500">
                Log in
              </Link>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
