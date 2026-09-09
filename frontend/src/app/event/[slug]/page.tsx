'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Header from '@/components/Header';

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

interface Photo {
  id: string;
  guest_name: string;
  guest_description: string;
  processed_image_path: string;
  is_visible: boolean;
  created_at: string;
}

interface UploadStatus {
  fileName: string;
  progress: number;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

type TabType = 'gallery' | 'upload';
type SortOption = 'recent' | 'old' | 'liked' | 'name';

// Fonction pour parser la date correctement
const parseDate = (dateString: string | undefined): Date => {
  if (!dateString) {
    return new Date(); // Retour par défaut si undefined/null
  }
  
  // Essayer le format ISO d'abord
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Si ce n'est pas valide, essayer d'autres formats
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  
  return new Date(); // Retour par défaut
};

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabType>('gallery');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [refreshing, setRefreshing] = useState(false);

  // Upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [guestName, setGuestName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Likes
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (slug) {
      fetchEvent(slug);
    }
  }, [slug]);

  const fetchEvent = async (eventSlug: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/public/events/${eventSlug}`
      );

      if (response.data.success) {
        setEvent(response.data.data);
        await fetchPhotos(eventSlug);
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

  const fetchPhotos = async (eventSlug: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/guest/${eventSlug}/photos`
      );

      if (response.data.success) {
        setPhotos(response.data.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement photos', error);
    }
  };

  // Trier les photos selon le critère sélectionné
  useEffect(() => {
    let sorted = [...photos];

    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'old':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'liked':
        sorted.sort((a, b) => {
          const aLikes = likedPhotos.has(a.id) ? 1 : 0;
          const bLikes = likedPhotos.has(b.id) ? 1 : 0;
          return bLikes - aLikes;
        });
        break;
      case 'name':
        sorted.sort((a, b) => (a.guest_name || '').localeCompare(b.guest_name || ''));
        break;
      default:
        break;
    }

    setFilteredPhotos(sorted);
  }, [photos, sortBy, likedPhotos]);

  // Keyboard navigation pour la lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'Escape') closeLightbox();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxIndex]);

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
          `${process.env.NEXT_PUBLIC_API_URL}/api/guest/${event?.slug}/photos`,
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
        fetchEvent(slug);
      }, 5000);
    } else {
      setIsUploading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos(slug);
    setRefreshing(false);
  };

  const toggleLike = (photoId: string) => {
    const newLiked = new Set(likedPhotos);
    if (newLiked.has(photoId)) {
      newLiked.delete(photoId);
    } else {
      newLiked.add(photoId);
    }
    setLikedPhotos(newLiked);
  };

  const copyPhotoLink = (photoId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/event/${slug}?photoId=${photoId}`);
    alert('✓ Lien copié !');
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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextPhoto = () => {
    setLightboxIndex((prev) => (prev + 1) % filteredPhotos.length);
  };

  const prevPhoto = () => {
    setLightboxIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header showNavigation={true} showLogout={false} />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-600">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header showNavigation={true} showLogout={false} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-slate-600 mb-4">❌ {error || 'Événement non trouvé'}</p>
            <Link href="/" className="text-slate-900 font-semibold hover:underline">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Unifié */}
      <Header showNavigation={true} showLogout={false} />

      {/* Event Header - Centered & Large */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16">
          {/* Centered Content */}
          <div className="text-center space-y-6 mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900">
              {event.title}
            </h1>
            
            {/* Date and Location */}
            <div className="space-y-2">
              <p className="text-xl text-slate-700 font-medium">
                Le {parseDate(event.eventDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })} à {event.location}
              </p>
              <p className="text-slate-600 text-sm uppercase tracking-wide">
                {getEventTypeLabel(event.eventType)}
              </p>
            </div>
          </div>

          {/* Custom Message */}
          {event.custom_message ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-blue-900 text-sm text-center">{event.custom_message}</p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-slate-900 font-medium text-center mb-2">Bienvenue ! 👋</p>
              <p className="text-slate-600 text-sm text-center">
                Partagez vos photos et vidéos de cet événement. En quelques secondes, elles seront visibles par tous les autres invités.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-slate-200 mb-8 overflow-hidden">
          <div className="flex gap-0">
            <button
              onClick={() => setTab('gallery')}
              className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition ${
                tab === 'gallery'
                  ? 'border-slate-900 text-slate-900 bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Galerie ({photos.length})
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition ${
                tab === 'upload'
                  ? 'border-slate-900 text-slate-900 bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Charger des photos
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-8">
            <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-lg text-center font-semibold text-sm">
              ✓ {successMessage}
            </div>
          </div>
        )}

        {/* Tab: Gallery */}
        {tab === 'gallery' && (
          <div className="space-y-6">
            {/* Gallery Controls */}
            {photos.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  {/* Sort Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold text-slate-900 self-center">Trier par :</span>
                    <div className="flex flex-wrap gap-2">
                      {(['recent', 'old', 'liked', 'name'] as const).map((option) => {
                        const labels: { [key: string]: string } = {
                          recent: 'Récent',
                          old: 'Ancien',
                          liked: 'Aimées',
                          name: 'Participant'
                        };
                        return (
                          <button
                            key={option}
                            onClick={() => setSortBy(option)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                              sortBy === option
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                            }`}
                          >
                            {labels[option]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? 'Actualisation...' : 'Actualiser'}
                  </button>
                </div>
              </div>
            )}

            {filteredPhotos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative bg-white rounded-lg overflow-hidden border border-slate-200 hover:shadow-lg transition group cursor-pointer"
                    onClick={() => openLightbox(index)}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-slate-100 overflow-hidden relative">
                      <img
                        src={`https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${photo.processed_image_path}`}
                        alt="Photo"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />

                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(photo.id);
                          }}
                          className="bg-white/80 hover:bg-white text-slate-900 p-3 rounded-full transition transform hover:scale-110"
                          title="Liker"
                        >
                          {likedPhotos.has(photo.id) ? '❤️' : '🤍'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyPhotoLink(photo.id);
                          }}
                          className="bg-white/80 hover:bg-white text-slate-900 p-3 rounded-full transition transform hover:scale-110"
                          title="Copier le lien"
                        >
                          🔗
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2">
                      {photo.guest_description && (
                        <p className="text-slate-900 text-sm line-clamp-2">
                          {photo.guest_description}
                        </p>
                      )}
                      <p className="text-slate-500 text-xs">
                        {new Date(photo.created_at).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} {photo.guest_name && `par ${photo.guest_name}`}
                      </p>

                      {/* Likes counter */}
                      {likedPhotos.has(photo.id) && (
                        <p className="text-red-600 text-xs font-semibold">
                          ❤️ Vous aimez cette photo
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-slate-600 mb-6">Aucune photo pour le moment</p>
                <button
                  onClick={() => setTab('upload')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition"
                >
                  Charger les premières photos
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Upload */}
        {tab === 'upload' && (
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Charger vos photos</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Guest Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Votre nom/prénom *
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="ex: Sophie Dupont"
                  disabled={isUploading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition disabled:bg-slate-100 text-sm"
                  required
                />
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
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
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez vos photos..."
                  maxLength={500}
                  disabled={isUploading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition resize-none disabled:bg-slate-100 text-sm"
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
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && filteredPhotos.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white text-3xl hover:opacity-70 transition"
          >
            ✕
          </button>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevPhoto();
            }}
            className="absolute left-4 text-white text-4xl hover:opacity-70 transition"
          >
            ‹
          </button>

          {/* Image Container */}
          <div
            className="max-w-4xl max-h-[80vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${filteredPhotos[lightboxIndex].processed_image_path}`}
              alt="Full view"
              className="max-h-[70vh] max-w-full object-contain rounded-lg"
            />

            {/* Photo Info */}
            <div className="mt-4 text-center">
              <p className="text-white text-sm">
                {lightboxIndex + 1} / {filteredPhotos.length}
              </p>
              {filteredPhotos[lightboxIndex].guest_name && (
                <p className="text-gray-300 text-sm mt-2">
                  par {filteredPhotos[lightboxIndex].guest_name}
                </p>
              )}
              {filteredPhotos[lightboxIndex].guest_description && (
                <p className="text-gray-300 text-sm mt-2">
                  {filteredPhotos[lightboxIndex].guest_description}
                </p>
              )}

              {/* Lightbox Actions */}
              <div className="flex gap-4 justify-center mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(filteredPhotos[lightboxIndex].id);
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition transform hover:scale-110"
                >
                  {likedPhotos.has(filteredPhotos[lightboxIndex].id) ? '❤️' : '🤍'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyPhotoLink(filteredPhotos[lightboxIndex].id);
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition transform hover:scale-110"
                >
                  🔗
                </button>
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextPhoto();
            }}
            className="absolute right-4 text-white text-4xl hover:opacity-70 transition"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
