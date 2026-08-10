'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import JSZip from 'jszip';

interface Event {
  id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: string;
  location: string;
  description: string;
}

interface Photo {
  id: string;
  guest_description: string;
  processed_image_path: string;
  is_visible: boolean;
  created_at: string;
}

type TabType = 'infos' | 'qrcode' | 'partage' | 'photos';

export default function EventSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [tab, setTab] = useState<TabType>('infos');
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [clientId, setClientId] = useState('');
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('clientId');
    if (!id) {
      router.push('/');
    } else {
      setClientId(id);
      fetchEventData(id);
    }
  }, [router]);

  const fetchEventData = async (userId: string) => {
    try {
      // Fetch event infos
      const eventResponse = await axios.get(
        `http://localhost:5000/api/events/${userId}`
      );

      if (eventResponse.data.success) {
        const foundEvent = eventResponse.data.data.events.find(
          (e: Event) => e.id === eventId
        );
        if (foundEvent) {
          setEvent(foundEvent);
          // Fetch photos
          const photosResponse = await axios.get(
            `http://localhost:5000/api/guest/${foundEvent.slug}/photos`
          );
          if (photosResponse.data.success) {
            setPhotos(photosResponse.data.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement données', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/client/events/${eventId}/qrcode`
      );
      if (response.data.success) {
        setQrCode(response.data.data.qrCode);
      }
    } catch (error) {
      console.error('Erreur QR Code', error);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qrcode-${event?.title}.png`;
    link.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✓ Copié !');
  };

  const approvePhoto = async (photoId: string) => {
    try {
      await axios.patch(`http://localhost:5000/api/client/photos/${photoId}/approve`);
      setPhotos(photos.map(p => p.id === photoId ? { ...p, is_visible: true } : p));
    } catch (error) {
      alert('Erreur lors de l\'approbation');
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr ?')) return;
    setDeletingPhotoId(photoId);
    try {
      await axios.patch(`http://localhost:5000/api/client/photos/${photoId}/reject`);
      setPhotos(photos.filter(p => p.id !== photoId));
    } catch (error) {
      alert('Erreur lors de la suppression');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const downloadAllPhotosAsZip = async () => {
    if (photos.length === 0) return;
    setDownloadingAll(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('photos');
      if (!folder) return;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const imageUrl = `https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${photo.processed_image_path}`;
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        folder.file(`photo-${i + 1}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `galerie-${event?.slug}.zip`;
      link.click();
    } catch (error) {
      alert('Erreur lors du téléchargement');
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Événement non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
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
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{event.title}</h1>
          <p className="text-slate-600">Paramètres de l'événement</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200">
          {(['infos', 'qrcode', 'partage', 'photos'] as const).map((tabName) => (
            <button
              key={tabName}
              onClick={() => {
                setTab(tabName);
                if (tabName === 'qrcode' && !qrCode) {
                  fetchQRCode();
                }
              }}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                tab === tabName
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tabName === 'infos' && '📋 Informations'}
              {tabName === 'qrcode' && '🎫 QR Code'}
              {tabName === 'partage' && '🔗 Partage'}
              {tabName === 'photos' && '📸 Photos'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-slate-200 p-8">
          {/* Infos Tab */}
          {tab === 'infos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Nom de l'événement
                  </label>
                  <p className="text-slate-600">{event.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Type
                  </label>
                  <p className="text-slate-600">{event.event_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Date
                  </label>
                  <p className="text-slate-600">
                    {new Date(event.event_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Lieu
                  </label>
                  <p className="text-slate-600">{event.location}</p>
                </div>
              </div>
              {event.description && (
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Description
                  </label>
                  <p className="text-slate-600">{event.description}</p>
                </div>
              )}
            </div>
          )}

          {/* QR Code Tab */}
          {tab === 'qrcode' && (
            <div className="space-y-6 text-center">
              {qrCode ? (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 inline-block">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <button
                    onClick={downloadQRCode}
                    className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition"
                  >
                    ⬇️ Télécharger QR Code
                  </button>
                </>
              ) : (
                <p className="text-slate-600">Chargement du QR Code...</p>
              )}
            </div>
          )}

          {/* Partage Tab */}
          {tab === 'partage' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Lien de partage
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`http://localhost:3000/event/${event.slug}`}
                    readOnly
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(`http://localhost:3000/event/${event.slug}`)
                    }
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition"
                  >
                    Copier
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Partagez ce lien avec vos invités
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Code d'accès
                </label>
                <p className="text-slate-600 text-lg font-mono">{event.slug}</p>
              </div>
            </div>
          )}

          {/* Photos Tab */}
          {tab === 'photos' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-slate-600">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </p>
                {photos.length > 0 && (
                  <button
                    onClick={downloadAllPhotosAsZip}
                    disabled={downloadingAll}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold px-4 py-2 rounded-lg transition"
                  >
                    {downloadingAll ? '⏳' : '📥'} Exporter tout
                  </button>
                )}
              </div>

              {photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      <div className="aspect-video bg-slate-100 overflow-hidden">
                        <img
                          src={`https://ldtxknyhnlijxewqxcpy.supabase.co/storage/v1/object/public/event-photos/${photo.processed_image_path}`}
                          alt="Photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-3">
                        {photo.guest_description && (
                          <p className="text-sm text-slate-900">
                            {photo.guest_description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {photo.is_visible ? (
                            <span className="inline-block bg-green-50 text-green-900 text-xs font-semibold px-2 py-1 rounded">
                              ✓ Publiée
                            </span>
                          ) : (
                            <span className="inline-block bg-yellow-50 text-yellow-900 text-xs font-semibold px-2 py-1 rounded">
                              ⏳ En attente
                            </span>
                          )}
                        </div>

                        {!photo.is_visible && (
                          <button
                            onClick={() => approvePhoto(photo.id)}
                            className="w-full bg-green-50 hover:bg-green-100 text-green-900 font-medium py-2 rounded transition text-sm"
                          >
                            ✓ Approuver
                          </button>
                        )}

                        <button
                          onClick={() => deletePhoto(photo.id)}
                          disabled={deletingPhotoId === photo.id}
                          className="w-full bg-red-50 hover:bg-red-100 disabled:bg-slate-200 text-red-900 disabled:text-slate-600 font-medium py-2 rounded transition text-sm"
                        >
                          {deletingPhotoId === photo.id ? '⏳' : '🗑️'} Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-600 py-8">Aucune photo</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}