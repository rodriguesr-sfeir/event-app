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
  const [clientId, setClientId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats>({
    eventCount: 0,
    photoCount: 0,
    participantCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const email = localStorage.getItem('clientEmail');
    const id = localStorage.getItem('clientId');

    if (!email || !id) {
      router.push('/');
    } else {
      setClientEmail(email);
      setClientId(id);
      fetchEventsWithStats(id);
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
      wedding: '💍 Mariage',
      birthday: '🎂 Anniversaire',
      corporate: '💼 Professionnel',
      festival: '🎪 Festival',
      party: '🎉 Fête',
      other: '📌 Autre'
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-slate-900">📸 EventShare</div>
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
            <p className="text-slate-600">Bienvenue, {clientEmail.split('@')[0]}</p>
          </div>
          <Link
            href="/client/create-event"
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition flex items-center gap-2"
          >
            <span>+</span> Nouvel événement
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
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.eventCount}</p>
                <p className="text-slate-500 text-sm mt-1">Total actif</p>
              </div>

              {/* Photos */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-600 font-medium">Médias</p>
                  <span className="text-2xl">📸</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.photoCount}</p>
                <p className="text-slate-500 text-sm mt-1">Photos partagées</p>
              </div>

              {/* Participants */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-600 font-medium">Participants</p>
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.participantCount}</p>
                <p className="text-slate-500 text-sm mt-1">Contributeurs</p>
              </div>

              {/* This Month */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-600 font-medium">Ce mois</p>
                  <span className="text-2xl">📈</span>
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
                              {event.is_active ? '🟢 Actif' : '⚫ Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {/* Access */}
                              <Link
                                href={`/event/${event.slug}`}
                                className="p-2 hover:bg-blue-100 rounded-lg transition"
                                title="Accéder"
                              >
                                🔗
                              </Link>

                              {/* Settings */}
                              <Link
                                href={`/client/event/${event.id}/settings`}
                                className="p-2 hover:bg-blue-100 rounded-lg transition"
                                title="Paramètres"
                              >
                                ⚙️
                              </Link>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={deletingId === event.id}
                                className="p-2 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                                title="Supprimer"
                              >
                                {deletingId === event.id ? '⏳' : '🗑️'}
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