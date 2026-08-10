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
  photoCount: number;
  participantCount: number;
  is_active: boolean;
}

interface Stats {
  eventCount: number;
  photoCount: number;
  participantCount: number;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats>({
    eventCount: 0,
    photoCount: 0,
    participantCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('clientEmail');
    const clientId = localStorage.getItem('clientId');
    const clientName = localStorage.getItem('clientName');

    if (!email || !clientId) {
      router.push('/');
    } else {
      setClientEmail(email);
      setClientId(clientId);
      setUserName(clientName || '');
      fetchEventsWithStats(clientId);
    }
  }, [router]);

  const fetchEventsWithStats = async (userId: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/events/${userId}`);

      if (response.data.success) {
        setEvents(response.data.data.events);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement events', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientId');
    localStorage.removeItem('clientEmail');
    localStorage.removeItem('clientName');
    router.push('/');
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      return;
    }

    setDeletingId(eventId);
    try {
      const response = await axios.delete(`http://localhost:5000/api/events/${eventId}`);

      if (response.data.success) {
        setEvents(events.filter(e => e.id !== eventId));
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      alert('Erreur serveur');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      wedding: 'Mariage',
      birthday: 'Anniversaire',
      corporate: 'Professionnel',
      festival: 'Festival',
      party: 'Fête',
      other: 'Autre'
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <img src="/images/logo.png" alt="Epik Events" className="h-16 w-auto" />
          <div className="flex items-center gap-6">
            <span className="text-slate-600 text-sm">{clientEmail}</span>
            <button
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900 font-medium transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-1">Dashboard</h1>
            <p className="text-slate-600">Bienvenue, {userName}</p>
          </div>
          <Link
            href="/client/create-event"
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            + Nouvel événement
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Chargement...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Events */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-600 font-medium">Événements</p>
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.eventCount}</p>
                <p className="text-slate-500 text-sm mt-1">Total actif</p>
              </div>

              {/* Photos */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-600 font-medium">Médias</p>
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.photoCount}</p>
                <p className="text-slate-500 text-sm mt-1">Photos partagées</p>
              </div>

              {/* Participants */}

<div className="bg-white rounded-lg border border-slate-200 p-6">
  <div className="flex items-center justify-between mb-4">
    <p className="text-slate-600 font-medium">Participants</p>
    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 20c0-3.314 2.687-6 6-6s6 2.686 6 6" />
    </svg>
  </div>
  <p className="text-3xl font-bold text-slate-900">{stats.participantCount}</p>
  <p className="text-slate-500 text-sm mt-1">Contributeurs</p>
</div>

              {/* This Month */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-600 font-medium">Ce mois</p>
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {events.filter(e => {
                    const eventDate = new Date(e.event_date);
                    const now = new Date();
                    return eventDate.getMonth() === now.getMonth() && 
                           eventDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
                <p className="text-slate-500 text-sm mt-1">Événements</p>
              </div>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Événements</h2>
              </div>

              {events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                          Événement
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                          Photos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                          Participants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">{event.title}</p>
                              <p className="text-sm text-slate-500">{getEventTypeLabel(event.event_type)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {new Date(event.event_date).toLocaleDateString('fr-FR', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {event.photoCount}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {event.participantCount}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              event.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {event.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* Access */}
                              <Link
                                href={`/event/${event.slug}`}
                                className="p-2 hover:bg-blue-50 rounded-lg transition text-slate-400 hover:text-blue-600"
                                title="Accéder"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </Link>

                              {/* Settings */}
                              <Link
                                href={`/client/event/${event.id}/settings`}
                                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-900"
                                title="Paramètres"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </Link>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={deletingId === event.id}
                                className="p-2 hover:bg-red-50 rounded-lg transition disabled:opacity-50 text-red-600 font-bold hover:text-red-700"
                                title="Supprimer"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-slate-600 mb-6">Aucun événement créé</p>
                  <Link
                    href="/client/create-event"
                    className="inline-block bg-slate-900 text-white font-semibold px-6 py-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    Créer un événement
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}