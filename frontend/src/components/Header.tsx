'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  showNavigation?: boolean;
  clientEmail?: string;
  title?: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  showLogout?: boolean;
}

export default function Header({
  showNavigation = true,
  clientEmail = '',
  title,
  subtitle,
  action,
  showLogout
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientId');
    localStorage.removeItem('clientEmail');
    localStorage.removeItem('clientName');
    router.push('/');
  };

  const displayLogout = showLogout !== false && clientEmail !== '';

  return (
    <>
      {/* Navigation Bar */}
      {showNavigation && (
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="flex-shrink-0">
              <img src="/images/logo.png" alt="Epik Events" className="h-18 w-auto" />
            </Link>
            {displayLogout && (
              <div className="flex items-center gap-6 ml-auto">
                {clientEmail && (
                  <span className="text-slate-600 text-sm whitespace-nowrap">{clientEmail}</span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-slate-900 font-medium transition whitespace-nowrap"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Header Section (Title + Action) */}
      {title && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-start gap-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-1">{title}</h1>
              {subtitle && (
                <p className="text-slate-600">{subtitle}</p>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0">
                {action.href ? (
                  <Link
                    href={action.href}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition whitespace-nowrap"
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    onClick={action.onClick}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition whitespace-nowrap"
                  >
                    {action.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

