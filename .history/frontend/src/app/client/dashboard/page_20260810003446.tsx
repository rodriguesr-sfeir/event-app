'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

interface Event {
  id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: string;
  location: string;
  is_active: boolean;
  photoCount: number;
  participantCount: number;
}

interface Stats {
  eventCount: number;
  photoCount: number;
  participantCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats>({ eventCount: 0, photoCount: 0, participantCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const clientId = localStorage.getItem('clientId');
    const clientName = localStorage.getItem('clientName');
    
    if (!clientId) {
      router.push('/client/login');
      return;
    }
    
    setUserId(clientId);
    setUserName(clientName || '');
    fetchEvents(clientId);
  }, [router]);

  const fetchEvents = async (userId: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/events/${userId}`);
      if (response.data.success) {
        setEvents(response.data.data.events || []);
        setStats(response.data.data.stats);
      }
    } catch {
      setError('Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${eventTitle}" ?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/events/${eventId}`);
      setEvents(events.filter((e) => e.id !== eventId));
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <span className="font-bold text-slate-900">EventShare</span>
          <button
            onClick={() => {
              localStorage.clear();
              router.push('/');
            }}
            className="text-slate-600 hover:text-slate-900 text-sm"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600 text-sm">
              Bienvenue{userName ? `, ${userName}` : ''}
            </p>
          </div>
          <Link
            href="/client/create-event"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            Nouvel événement
          </Link>
        </div>

        {/* Stats Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Événements', value: stats.eventCount, desc: 'Total actif' },
              { label: 'Médias', value: stats.photoCount, desc: 'Photos partagées' },
              { label: 'Participants', value: stats.participantCount, desc: 'Contributeurs' },
              { label: 'Ce mois', value: stats.eventCount, desc: 'Événements' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg p-6 border border-slate-200">
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-4">{stat.label}</h3>
                <p className="text-4xl font-bold text-slate-900 mb-2">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Events Section */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Vos événements</h2>
            <p className="text-slate-600 text-sm mb-6">Gérez et accédez à vos événements</p>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Chargement...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 text-sm">{error}</div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Aucun événement</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <th className="px-8 py-3 text-left font-semibold text-slate-900">Événement</th>
                  <th className="px-8 py-3 text-left font-semibold text-slate-900">Date</th>
                  <th className="px-8 py-3 text-left font-semibold text-slate-900">Médias</th>
                  <th className="px-8 py-3 text-left font-semibold text-slate-900">Statut</th>
                  <th className="px-8 py-3 text-left font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-8 py-4">
                      <p className="font-medium text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.location}</p>
                    </td>
                    <td className="px-8 py-4 text-slate-600">
                      {new Date(event.event_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-8 py-4 text-slate-600">{event.photoCount} médias</td>
                    <td className="px-8 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                        <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                        Actif
                      </span>
                    </td>
                    <td className="px-8 py-4 flex gap-3 text-slate-500">
                      <Link href={`/event/${event.slug}`} target="_blank" className="hover:text-slate-700">↗</Link>
                      <Link href={`/client/event/${event.id}/settings`} className="hover:text-slate-700">⚙</Link>
                      <button onClick={() => handleDeleteEvent(event.id, event.title)} className="hover:text-red-600">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}