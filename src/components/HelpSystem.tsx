/**
 * @module HelpSystem
 * @description A site-wide context-sensitive help widget.
 * - Detects the current route via React Router's useLocation.
 * - Provides tailored FAQs based on the page the user is currently viewing.
 * - Enhances user onboarding and platform navigation (satisfies 'Online Help' requirements).
 */
import { useState } from 'react';
import { HelpCircle, X, ChevronRight, MessageCircleQuestion } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const helpContent: Record<string, { title: string, faqs: { q: string, a: string }[] }> = {
  '/': {
    title: 'Welcome to Internova',
    faqs: [
      { q: 'What is Internova?', a: 'Internova is a comprehensive platform bridging students, universities, and companies for internship management.' },
      { q: 'How do I start?', a: 'Select your role from the portals on the page to sign in or create a new account.' },
    ]
  },
  '/login': {
    title: 'Login Assistance',
    faqs: [
      { q: 'I forgot my password.', a: 'Click the "Forgot password?" link on the login form to reset it via your registered email.' },
      { q: 'Why do students use Registration Numbers?', a: 'To ensure accurate integration with university databases, student identity is verified via their Registration Number and selected University.' },
    ]
  },
  '/signup': {
    title: 'Registration Help',
    faqs: [
      { q: 'Can I change my role later?', a: 'Roles are tied to your account type. If you register as a student, you cannot change to a company rep without creating a new account.' },
      { q: 'Why is my password marked as weak?', a: 'We require a strong password to protect your academic and professional data. Ensure all checklist items are met.' },
    ]
  },
  '/admin/dashboard': {
    title: 'Admin Dashboard Guide',
    faqs: [
      { q: 'What can I do here?', a: 'The Admin Dashboard allows you to manage system access, approve users, and export CSV reports.' },
      { q: 'How do I generate reports?', a: 'Scroll down to the "Reports" section, and click on either "Placements (CSV)" or "Logbooks (CSV)" to download the data.' },
    ]
  },
  '/student/dashboard': {
    title: 'Student Portal Help',
    faqs: [
      { q: 'How do I apply for attachments?', a: 'Click on the "Browse Attachments" button or use the navigation link. Find an opportunity and submit your CV.' },
      { q: 'Where do I submit my logbooks?', a: 'Once you are placed, click on "View Logbooks" to submit your weekly progress entries.' },
    ]
  },
  '/student/logbooks': {
    title: 'Logbooks Guide',
    faqs: [
      { q: 'How do I add a new entry?', a: 'Select your Application, click "New Entry", choose the week number, explain your tasks, and submit.' },
      { q: 'Can I edit an entry?', a: 'Yes, until it has received feedback from your supervisor.' },
    ]
  },
  '/company/dashboard': {
    title: 'Company Dashboard Guide',
    faqs: [
      { q: 'How do I post an opportunity?', a: 'Use the "Post New Opportunity" widget. Fill in the job title, requirements, location, and application deadline.' },
      { q: 'How do I approve applications?', a: 'Pending applications appear under your active posts. Click "Accept" or "Reject" to notify the student.' },
    ]
  },
  '/supervisor/dashboard': {
    title: 'University Supervisor Help',
    faqs: [
      { q: 'Who are my assigned students?', a: 'Students who created their account choosing your University will appear here.' },
      { q: 'How do I review logbooks?', a: 'Click the "View Logbooks" button next to a student\'s name. You can read their entries and submit feedback.' },
      { q: 'How do I download reports?', a: 'Use the Reports section on the right to download placements or logbooks in CSV format.' },
    ]
  }
};

export default function HelpSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Get content for the current path, default to general help
  const content = helpContent[location.pathname] || {
    title: 'Need Help?',
    faqs: [
      { q: 'How do I contact support?', a: 'Email us at support@internova.edu' }
    ]
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-navy text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition-colors z-50"
        aria-label="Help and Support"
      >
        <MessageCircleQuestion className="w-7 h-7" />
      </motion.button>

      {/* Help Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-navy text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-semibold">{content.title}</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white transition-colors"
                aria-label="Close Help"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FAQs */}
            <div className="p-5 overflow-y-auto max-h-96">
              <p className="text-sm text-slate-500 mb-4">
                Frequently asked questions for this page:
              </p>
              <div className="space-y-4">
                {content.faqs.map((faq, index) => (
                  <div key={index} className="space-y-1.5 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{faq.q}</span>
                    </h4>
                    <p className="text-sm text-slate-600 pl-6 border-l-2 border-transparent">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Still need help? <a href="https://wa.me/254700000000?text=Hello%20Support" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-medium hover:text-emerald-700 transition-colors">Contact Support via WhatsApp</a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
