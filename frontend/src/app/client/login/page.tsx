'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        localStorage.setItem('clientToken', response.data.data.token);
        localStorage.setItem('clientId', response.data.data.userId);
        localStorage.setItem('clientEmail', response.data.data.email);
        localStorage.setItem('clientName', `${response.data.data.first_name} ${response.data.data.last_name}`);
        router.push('/client/dashboard');
      } else {
        setError(response.data.error || 'Erreur de connexion');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <Link href="/">
            <img src="/images/logo.png" alt="Epik Events" className="h-18 w-auto" />
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Se connecter</h1>
            <p className="text-slate-600 text-sm">Accédez à votre compte Epik Events</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@example.com"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition text-sm"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition duration-200 text-sm"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-slate-400 text-xs">Pas encore inscrit ?</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Signup Link */}
          <Link
            href="/client/signup"
            className="block w-full text-center border border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold py-3 rounded-lg transition duration-200 text-sm"
          >
            Créer un compte
          </Link>

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs mt-8">
            En continuant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  );
}