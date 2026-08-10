'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

interface Event {
  eventId: string;
  slug: string;
  title: string;
  eventType: string;
  eventDate: string;
  location: string;
  description: string;
}

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug) {
      fetchEvent(slug);
    }
  }, [slug]);

  const fetchEvent = async (eventSlug: string) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/public/events/${eventSlug}`
      );

      if (response.data.success) {
        setEvent(response.data.data);
        setError('');
      } else {
        setError(response.data.error || 'Événement non trouvé');
      }
    } catch (err: any) {
      setError('Événement non trouvé');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeEmoji = (type: string) => {
    const emojis: { [key: string]: string } = {
      wedding: '💍',
      birthday: '🎂',
      corporate: '💼',
      festival: '🎪',
      party: '🎉',
      other: '📌'
    };
    return emojis[type] || '📌';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            📸
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-600">Chargement de l'événement...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg mb-8">
            ✕ {error}
          </div>
        )}

        {!loading && !error && event && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{getEventTypeEmoji(event.eventType)}</span>
                <h1 className="text-4xl font-bold text-slate-900">{event.title}</h1>
              </div>
              {event.description && (
                <p className="text-slate-600 text-lg">{event.description}</p>
              )}
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-600 text-sm font-medium mb-1">📅 Date</p>
                <p className="text-slate-900 font-semibold">
                  {new Date(event.eventDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-600 text-sm font-medium mb-1">📍 Lieu</p>
                <p className="text-slate-900 font-semibold">{event.location}</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <p className="text-slate-900">
                <strong>Bienvenue ! 🎉</strong>
              </p>
              <p className="text-slate-600 mt-2">
                Partagez vos photos et vidéos de cet événement. En quelques secondes, elles
                seront visibles par tous les autres invités.
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href={`/upload?eventSlug=${event.slug}&eventId=${event.eventId}`}
                className="block bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition duration-200 text-center"
              >
                📸 Uploader une photo
              </Link>

              <Link
                href={`/gallery?eventSlug=${event.slug}&eventId=${event.eventId}`}
                className="block bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 rounded-lg transition duration-200 text-center"
              >
                🖼️ Galerie
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}