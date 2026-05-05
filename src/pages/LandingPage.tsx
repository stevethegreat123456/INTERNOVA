import { motion } from 'motion/react';
import { GraduationCap, Landmark, Building2, UserCheck, BookOpen, ShieldCheck } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const portals = [
  {
    id: 'student',
    title: 'Student Portal',
    description: 'Access internship opportunities and manage your logbook',
    icon: GraduationCap,
  },
  {
    id: 'company',
    title: 'Company Portal',
    description: 'Manage applicants and internship placements',
    icon: Building2,
  },
  {
    id: 'supervisor',
    title: 'University Portal',
    description: 'Supervise students and manage partnerships',
    icon: UserCheck,
  },
  {
    id: 'admin',
    title: 'Admin Portal',
    description: 'Administer the Internova platform',
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Navigation */}
      <header className="px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span>Internova</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="max-w-[960px] w-full mx-auto space-y-15">
          
          {/* Hero Section */}
          <div className="text-center mb-[60px] max-w-3xl mx-auto mt-8 sm:mt-12">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[32px] sm:text-4xl font-bold tracking-tight text-navy mb-4"
            >
              One Platform for <br className="hidden sm:block" />
              <span className="text-navy">
                Academic Excellence
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[16px] text-slate-500 font-normal max-w-2xl mx-auto"
            >
              Select your portal below to sign in or get started. Experience seamless collaboration between students, universities, and industry.
            </motion.p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 pb-[60px]">
            {portals.map((portal, index) => {
              const Icon = portal.icon;
              return (
                <motion.div
                  key={portal.id}
                  onClick={() => navigate(`/login?role=${portal.id}`)}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: 0.2 + index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="cursor-pointer group relative bg-white border border-slate-200 rounded-xl px-6 py-8 text-center flex flex-col items-center shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 h-full"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 stroke-2" />
                  </div>
                  <h2 className="text-base font-semibold text-navy mb-3 leading-snug">{portal.title}</h2>
                  <p className="text-[13px] text-slate-500 leading-relaxed mb-6 flex-grow">
                    {portal.description}
                  </p>
                  <div className="text-[13px] font-semibold text-blue-500 bg-slate-50 border border-blue-100 px-4 py-2 rounded-md transition-colors w-full sm:w-auto mt-auto group-hover:bg-blue-500 group-hover:text-white">
                    Access Portal 
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-6 mt-[60px] mb-8 text-center">
        <span className="text-xs text-slate-400 uppercase tracking-wider">&copy; {new Date().getFullYear()} Internova Inc. All rights reserved.</span>
      </footer>
    </div>
  );
}
