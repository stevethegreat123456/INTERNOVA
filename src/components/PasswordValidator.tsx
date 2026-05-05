import { Check, X } from 'lucide-react';
import { useMemo } from 'react';

interface PasswordValidatorProps {
  password: string;
}

export default function PasswordValidator({ password }: PasswordValidatorProps) {
  const requirements = useMemo(() => [
    { id: 'length', text: 'At least 8 characters', met: password.length >= 8 },
    { id: 'uppercase', text: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'lowercase', text: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { id: 'number', text: 'At least one number', met: /[0-9]/.test(password) },
    { id: 'special', text: 'At least one special character', met: /[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(password) },
  ], [password]);

  const requirementsMet = requirements.filter(req => req.met).length;
  const totalRequirements = requirements.length;
  const strengthPercentage = (requirementsMet / totalRequirements) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage === 0) return 'bg-slate-200';
    if (strengthPercentage <= 40) return 'bg-red-500';
    if (strengthPercentage <= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
        <div 
          className={`h-full transition-all duration-300 ease-out ${getStrengthColor()}`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>
      
      {/* Checklist */}
      {password.length > 0 && strengthPercentage < 100 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-center gap-2 text-xs">
              {req.met ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <X className="w-4 h-4 text-slate-300" />
              )}
              <span className={req.met ? "text-slate-700" : "text-slate-400"}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
