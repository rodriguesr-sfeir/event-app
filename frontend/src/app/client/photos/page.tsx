'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

interface Photo {
  id: string;
  guest_description: string;
  processed_image_path: string;
  is_visible: boolean;
  created_at: string;
}

export default function ClientPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('clientId');
    if (!id) {
      router.push('/client/login');
    } else {
      setClientId(id);
      fetchPhotos(id);
    }
  }, [router]);

  const fetchPhotos = async (userId: string) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/client/photos/${userId}`
      );

      if (response.data.success) {
        setPhotos(response.data.data || []);
        setError('');
      } else {
        setError(response.data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      setError('Impossible de charger les photos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approvePhoto = async (photoId: string) => {
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/client/photos/${photoId}/approve`
      );

      if (response.data.success) {
        setPhotos(photos.map(p => 
          p.id === photoId ? { ...p, is_visible: true } : p
        ));
      } else {
        alert('Erreur lors de l\'approbation');
      }
    } catch (error) {
      alert('Erreur serveur');
      console.error(error);
    }
  };

  const rejectPhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette photo ?')) {
      return;
    }

    try {
      const response = await axios.patch(
        `http://localhost:5000/api/client/photos/${photoId}/reject`
      );

      if (response.data.success) {
        setPhotos(photos.filter(p => p.id !== photoId));
      } else {
        alert('Erreur lors du rejet');
      }
    } catch (error) {
      alert('Erreur serveur');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/client/dashboard" className="text-2xl font-bold text-slate-900">
            📸
          </Link>
          <Link
            href="/client/dashboard"
            className="text-slate-600 hover:text-slate-900 font-medium transition"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
            Modération
          </h1>
          <p className="text-slate-600">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} à modérer
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-600">Chargement...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg mb-8">
            ✕ {error}
          </div>
        )}

        {!loading && photos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-md transition"
              >
                {/* Image */}
                <div className="aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={`https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${photo.processed_image_path}`}
                    alt={photo.guest_description || 'Photo'}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Description */}
                  {photo.guest_description && (
                    <p className="text-slate-900 text-sm line-clamp-2">
                      {photo.guest_description}
                    </p>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {photo.is_visible ? (
                      <span className="inline-block bg-green-50 text-green-900 text-xs font-medium px-2 py-1 rounded">
                        ✓ Publiée
                      </span>
                    ) : (
                      <span className="inline-block bg-yellow-50 text-yellow-900 text-xs font-medium px-2 py-1 rounded">
                        ⏳ En attente
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <p className="text-slate-500 text-xs">
                    {new Date(photo.created_at).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {/* Actions */}
                  {!photo.is_visible && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => approvePhoto(photo.id)}
                        className="w-full bg-green-50 hover:bg-green-100 text-green-900 font-medium py-2 rounded transition text-sm"
                      >
                        ✓ Approuver
                      </button>
                      <button
                        onClick={() => rejectPhoto(photo.id)}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-900 font-medium py-2 rounded transition text-sm"
                      >
                        ✕ Rejeter
                      </button>
                    </div>
                  )}

                  {photo.is_visible && (
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        onClick={() => rejectPhoto(photo.id)}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-900 font-medium py-2 rounded transition text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && photos.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-slate-600 mb-6">Aucune photo à modérer</p>
            <Link
              href="/client/dashboard"
              className="inline-block bg-slate-900 text-white font-semibold px-6 py-2 rounded-lg hover:bg-slate-800 transition duration-200"
            >
              Retour au dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}