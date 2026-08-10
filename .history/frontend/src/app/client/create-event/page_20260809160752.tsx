'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function CreateEventPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    event_type: 'wedding',
    event_date: '',
    location: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Valider les champs
      if (!formData.title.trim()) {
        setError('Le nom de l\'événement est requis');
        setLoading(false);
        return;
      }

      if (!formData.event_date) {
        setError('La date est requise');
        setLoading(false);
        return;
      }

      if (!formData.location.trim()) {
        setError('Le lieu est requis');
        setLoading(false);
        return;
      }

      // Générer le slug
      const slug = generateSlug(formData.title);

      // Récupérer le clientId depuis localStorage
      const clientId = localStorage.getItem('clientId');
      if (!clientId) {
        setError('Vous devez être connecté');
        router.push('/');
        return;
      }

      // Envoyer les données au backend
      const response = await axios.post(
        'http://localhost:5000/api/client/events',
        {
          title: formData.title,
          event_type: formData.event_type,
          event_date: formData.event_date,
          location: formData.location,
          description: formData.description,
          slug: slug,
          client_id: clientId
        }
      );

      if (response.data.success) {
        // Rediriger vers le dashboard
        router.push('/client/dashboard');
      } else {
        setError(response.data.error || 'Erreur lors de la création de l\'événement');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || 'Erreur lors de la création';
      setError(errorMessage);
      console.error('Create event error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/client/dashboard" className="text-2xl font-bold text-slate-900">
            📸 EventShare
          </Link>
          <Link
            href="/client/dashboard"
            className="text-slate-600 hover:text-slate-900 font-medium transition"
          >
            ← Retour
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Créer un événement</h1>
          <p className="text-slate-600">Créez un nouvel événement et commencez à collecter des photos</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg mb-6">
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Nom de l'événement *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="ex: Mariage de Sophie et Marc"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Type d'événement *
            </label>
            <select
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
            >
              <option value="wedding">💍 Mariage</option>
              <option value="birthday">🎂 Anniversaire</option>
              <option value="corporate">💼 Événement d'entreprise</option>
              <option value="festival">🎪 Festival</option>
              <option value="party">🎉 Fête</option>
              <option value="other">📌 Autre</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Date de l'événement *
            </label>
            <input
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Lieu *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="ex: Paris, France"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Description (optionnel)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Décrivez votre événement..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            {loading ? 'Création en cours...' : 'Créer l\'événement'}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            <strong>💡 Astuce :</strong> Après la création, vous pourrez modifier les paramètres,
            générer un QR code et gérer les photos des invités.
          </p>
        </div>
      </div>
    </div>
  );
}