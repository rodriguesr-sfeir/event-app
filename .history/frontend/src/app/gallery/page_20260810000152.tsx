'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import JSZip from 'jszip';

interface Photo {
  id: string;
  guest_name: string;
  guest_description: string;
  processed_image_path: string;
  image_width: number;
  image_height: number;
  created_at: string;
  is_visible: boolean;
  likes?: number;
}

type SortOption = 'recent' | 'old' | 'liked' | 'name';

export default function Gallery() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [eventSlug, setEventSlug] = useState('test-event');
  const [eventId, setEventId] = useState('552497f9-e994-4fd6-8f00-f1b253142217');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Lightbox states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const slugParam = params.get('eventSlug');
      const idParam = params.get('eventId');

      const finalSlug = slugParam || 'test-event';
      const finalId = idParam || '552497f9-e994-4fd6-8f00-f1b253142217';

      setEventSlug(finalSlug);
      setEventId(finalId);

      fetchPhotos(finalId, finalSlug);
    }

    const clientId = localStorage.getItem('clientId');
    setIsAdmin(!!clientId);
  }, []);

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

  const fetchPhotos = async (id: string, slug: string) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/guest/${slug}/photos`,
        { params: { eventId: id } }
      );

      if (response.data.success) {
        const filteredPhotos = response.data.data?.map((p: Photo) => ({
          ...p,
          likes: 0
        })) || [];
        setPhotos(filteredPhotos);
        setError('');
      } else {
        setError(response.data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      setError('Impossible de charger les photos');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos(eventId, eventSlug);
  };

  const downloadPhoto = async (imagePath: string, photoId: string) => {
    try {
      const imageUrl = `https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${imagePath}`;
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `photo-${photoId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      alert('Erreur lors du téléchargement');
      console.error(error);
    }
  };

  const downloadAllPhotosAsZip = async () => {
    if (photos.length === 0) {
      alert('Aucune photo à télécharger');
      return;
    }

    setDownloadingAll(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('photos');

      if (!folder) {
        alert('Erreur lors de la création du ZIP');
        return;
      }

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const imageUrl = `https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${photo.processed_image_path}`;

        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const filename = `photo-${i + 1}-${photo.id}.png`;
          folder.file(filename, blob);
        } catch (err) {
          console.error(`Erreur pour photo ${i + 1}:`, err);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `galerie-${eventSlug}-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      alert(`✅ ${photos.length} photo(s) téléchargée(s) !`);
    } catch (error) {
      alert('❌ Erreur lors de la création du ZIP');
      console.error(error);
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return;
    }

    setDeletingId(photoId);
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/client/photos/${photoId}/reject`
      );

      if (response.data.success) {
        setPhotos(photos.filter((p) => p.id !== photoId));
        alert('✅ Photo supprimée !');
      } else {
        alert('❌ Erreur lors de la suppression');
      }
    } catch (error) {
      alert('❌ Erreur serveur');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
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
    const link = `${window.location.origin}/gallery?eventSlug=${eventSlug}&eventId=${eventId}#photo-${photoId}`;
    navigator.clipboard.writeText(link);
    alert('✓ Lien copié !');
  };

  const openLightbox = (index: number) => {
    const photoIndex = filteredPhotos.findIndex(p => p.id === photos[index].id);
    setLightboxIndex(photoIndex >= 0 ? photoIndex : index);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-slate-900">📸</div>
          <div className="flex items-center gap-4">
            <Link
              href={`/event/${eventSlug}`}
              className="text-slate-600 hover:text-slate-900 font-medium transition"
            >
              Retour à l'événement
            </Link>
            {isAdmin && (
              <Link
                href="/client/dashboard"
                className="text-slate-600 hover:text-slate-900 font-medium transition"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">Galerie</h1>
          <p className="text-slate-600">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} partagée
            {photos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-600">Chargement...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg mb-8">
            ✕ {error}
          </div>
        )}

        {/* Controls */}
        {!loading && photos.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex gap-4 items-center flex-wrap">
              {/* Tri */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-900">Trier par :</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="recent">Plus récentes</option>
                  <option value="old">Plus anciennes</option>
                  <option value="liked">Plus likées</option>
                  <option value="name">Par participant</option>
                </select>
              </div>

              {/* Actualiser */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-300 text-slate-900 font-medium rounded-lg transition"
              >
                {refreshing ? '⏳ Actualisation...' : '🔄 Actualiser'}
              </button>

              {/* Exporter */}
              {isAdmin && (
                <button
                  onClick={downloadAllPhotosAsZip}
                  disabled={downloadingAll}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold px-6 py-2 rounded-lg transition duration-200"
                >
                  {downloadingAll ? '⏳ Téléchargement...' : '📥 Exporter tout (ZIP)'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Gallery Grid - Instagram Style */}
        {!loading && filteredPhotos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition group cursor-pointer"
                onClick={() => openLightbox(filteredPhotos.findIndex(p => p.id === photo.id))}
              >
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-slate-100 relative">
                  <img
                    src={`https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${photo.processed_image_path}`}
                    alt={photo.guest_description || 'Photo'}
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

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="px-4 pb-4 space-y-2 border-t border-slate-200 pt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPhoto(photo.processed_image_path, photo.id);
                      }}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium py-2 rounded transition text-sm"
                    >
                      ⬇️ Télécharger
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      disabled={deletingId === photo.id}
                      className="w-full bg-red-50 hover:bg-red-100 disabled:bg-slate-200 text-red-900 disabled:text-slate-600 font-medium py-2 rounded transition text-sm"
                    >
                      {deletingId === photo.id ? '⏳ Suppression...' : '🗑️ Supprimer'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPhotos.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-slate-600 mb-6">📭 Aucune photo pour le moment</p>
            <Link
              href={`/event/${eventSlug}`}
              className="inline-block bg-slate-900 text-white font-semibold px-6 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              Uploader une photo
            </Link>
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
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadPhoto(
                        filteredPhotos[lightboxIndex].processed_image_path,
                        filteredPhotos[lightboxIndex].id
                      );
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition transform hover:scale-110"
                  >
                    ⬇️
                  </button>
                )}
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