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
  custom_message?: string;
}

interface UploadStatus {
  fileName: string;
  progress: number;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [guestName, setGuestName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

  // Auto-dismiss success message après 5 secondes
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-dismiss upload statuses après 5 secondes
  useEffect(() => {
    if (uploadStatuses.length === 0) return;

    const hasLoadingStatus = uploadStatuses.some(s => s.status === 'loading');
    if (hasLoadingStatus) return;

    const timer = setTimeout(() => {
      setUploadStatuses([]);
      setIsUploading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [uploadStatuses]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      alert('Veuillez entrer votre nom/prénom');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Veuillez sélectionner au moins une photo');
      return;
    }

    setIsUploading(true);

    const initialStatuses: UploadStatus[] = selectedFiles.map((file) => ({
      fileName: file.name,
      progress: 0,
      status: 'loading'
    }));
    setUploadStatuses(initialStatuses);
    setSuccessMessage('');

    let successfulUploads = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      try {
        const formData = new FormData();
        formData.append('photo', selectedFiles[i]);
        formData.append('description', i === 0 ? description : '');
        formData.append('guest_name', guestName);

        const response = await axios.post(
          `http://localhost:5000/api/guest/${event?.slug}/photos`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        if (response.data.success) {
          successfulUploads++;

          setUploadStatuses((prevStatuses) =>
            prevStatuses.map((status, idx) =>
              idx === i
                ? { ...status, progress: 100, status: 'success' as const }
                : status
            )
          );
        } else {
          const errorMessage = response.data.error || 'Erreur lors de l\'upload';
          setUploadStatuses((prevStatuses) =>
            prevStatuses.map((status, idx) =>
              idx === i
                ? { ...status, status: 'error' as const, error: errorMessage }
                : status
            )
          );
        }
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error || error.message || 'Erreur lors de l\'upload';

        setUploadStatuses((prevStatuses) =>
          prevStatuses.map((status, idx) =>
            idx === i
              ? { ...status, status: 'error' as const, error: errorMessage }
              : status
          )
        );
      }
    }

    if (successfulUploads > 0) {
      const message =
        successfulUploads === 1
          ? 'Succès, 1 photo a bien été ajoutée à votre galerie'
          : `Succès, ${successfulUploads} photos ont bien été ajoutées à votre galerie`;

      setSuccessMessage(message);

      setTimeout(() => {
        setSelectedFiles([]);
        setGuestName('');
        setDescription('');
        setUploadStatuses([]);
        setIsUploading(false);
      }, 5000);
    } else {
      setIsUploading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Chargement de l'événement...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">❌ {error || 'Événement non trouvé'}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/">
            <img src="/images/logo.png" alt="Epik Events" className="h-18 w-auto" />
          </Link>
        </div>
      </nav>

      {/* Event Header */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{getEventTypeEmoji(event.eventType)}</span>
            <h1 className="text-5xl font-bold text-slate-900">{event.title}</h1>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-2 text-slate-600">
              <span>📅</span>
              <p>
                {new Date(event.eventDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span>📍</span>
              <p>{event.location}</p>
            </div>
          </div>

          {/* Custom Message */}
          {event.custom_message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900">{event.custom_message}</p>
            </div>
          )}
          {!event.custom_message && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <p className="text-slate-900">
                <strong>Bienvenue ! 🎉</strong>
              </p>
              <p className="text-slate-600 mt-2">
                Partagez vos photos et vidéos de cet événement. En quelques secondes, elles
                seront visibles par tous les autres invités.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-8">
            <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-lg text-center font-semibold animate-pulse">
              ✓ {successMessage}
            </div>
          </div>
        )}

        {/* Upload Form */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Uploadez vos photos</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guest Name */}
            <div>
              <label className="block mb-3 text-sm font-medium text-slate-900">
                Votre nom/prénom *
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="ex: Sophie Dupont"
                disabled={isUploading}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition disabled:bg-slate-100"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Afin que nous sachions à qui appartiennent les photos</p>
            </div>

            {/* File Input */}
            <div>
              <label className="block mb-3 text-sm font-medium text-slate-900">
                Sélectionner une ou plusieurs photos
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-slate-400 transition cursor-pointer bg-slate-50">
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                  <div className="mb-4">
                    <svg
                      className="mx-auto w-12 h-12 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium mb-1">
                    {selectedFiles.length > 0
                      ? `✓ ${selectedFiles.length} photo(s) sélectionnée(s)`
                      : 'Cliquez pour sélectionner'}
                  </p>
                  <p className="text-slate-500 text-sm">JPG, PNG, WebP (max 50MB par photo)</p>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block mb-3 text-sm font-medium text-slate-900">
                Description (optionnel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez vos photos..."
                maxLength={500}
                disabled={isUploading}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition resize-none disabled:bg-slate-100"
                rows={4}
              />
              <p className="text-xs text-slate-500 mt-2">{description.length}/500</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0 || !guestName.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition duration-200"
            >
              {isUploading ? 'Upload en cours...' : 'Uploader les photos'}
            </button>
          </form>

          {/* Upload Progress */}
          {uploadStatuses.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Progression des uploads</h3>

              {uploadStatuses.map((status, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {status.fileName}
                    </p>
                    <span
                      className={`text-xs font-semibold ${
                        status.status === 'success'
                          ? 'text-green-600'
                          : status.status === 'error'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {status.status === 'success' && '✓ Succès'}
                      {status.status === 'loading' && '⏳ Upload...'}
                      {status.status === 'error' && '✕ Erreur'}
                    </span>
                  </div>

                  {status.status === 'loading' && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  )}

                  {status.status === 'success' && (
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full w-full" />
                    </div>
                  )}

                  {status.error && (
                    <div className="bg-red-50 border border-red-200 text-red-900 p-2 rounded text-xs">
                      {status.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gallery Link */}
        <div className="text-center">
          <Link
            href={`/gallery?eventSlug=${event.slug}&eventId=${event.eventId}`}
            className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold px-8 py-3 rounded-lg transition"
          >
            🖼️ Voir la galerie
          </Link>
        </div>
      </div>
    </div>
  );
}