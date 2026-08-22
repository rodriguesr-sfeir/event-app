'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Header from '@/components/Header';

interface Event {
  id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: string;
  location: string;
  description: string;
  custom_message?: string;
  is_public?: boolean;
  require_approval?: boolean;
  allow_uploads?: boolean;
}

type TabType = 'infos' | 'partage' | 'confidentialite';

export default function EventSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [tab, setTab] = useState<TabType>('infos');
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState<Event | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('clientId');
    const email = localStorage.getItem('clientEmail');
    if (!id) {
      router.push('/');
    } else {
      setClientId(id);
      setClientEmail(email || '');
      fetchEventData(id);
    }
  }, [router]);

  const fetchEventData = async (userId: string) => {
    try {
      const eventResponse = await axios.get(
        `http://localhost:5000/api/events/${userId}`
      );

      if (eventResponse.data.success) {
        const foundEvent = eventResponse.data.data.events.find(
          (e: Event) => e.id === eventId
        );
        if (foundEvent) {
          setEvent(foundEvent);
          setFormData(foundEvent);
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

  const printQRCode = () => {
    if (!qrCode) return;
    const printWindow = window.open();
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${event?.title}</title>
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: white; }
              img { max-width: 600px; }
            </style>
          </head>
          <body>
            <img src="${qrCode}" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✓ Copié !');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleToggle = (field: 'is_public' | 'require_approval' | 'allow_uploads') => {
    setFormData(prev => prev ? { ...prev, [field]: !prev[field] } : null);
  };

  const handleSave = async () => {
    if (!formData) return;

    setSaveLoading(true);
    setSaveMessage('');

    try {
      const response = await axios.patch(
        `http://localhost:5000/api/client/events/${eventId}/settings`,
        {
          title: formData.title,
          event_type: formData.event_type,
          event_date: formData.event_date,
          location: formData.location,
          description: formData.description,
          custom_message: formData.custom_message,
          is_public: formData.is_public,
          require_approval: formData.require_approval,
          allow_uploads: formData.allow_uploads
        }
      );

      if (response.data.success) {
        setSaveMessage('✓ Paramètres enregistrés avec succès');
        setEvent(response.data.data);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch (error: any) {
      setSaveMessage(`❌ Erreur: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header
          showNavigation={true}
          clientEmail={clientEmail}
          showLogout={true}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!event || !formData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header
          showNavigation={true}
          clientEmail={clientEmail}
          showLogout={true}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-600">Événement non trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Réutilisable */}
      <Header
        showNavigation={true}
        clientEmail={clientEmail}
        showLogout={true}
        title={event.title}
        subtitle="Paramètres de l'événement"
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Save Message */}
        {saveMessage && (
          <div className="mb-8">
            <div className={`p-4 rounded-lg text-center font-semibold text-sm ${
              saveMessage.includes('✓')
                ? 'bg-green-50 border border-green-200 text-green-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}>
              {saveMessage}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg border border-slate-200 mb-8 overflow-hidden">
          <div className="flex gap-0">
            {(['infos', 'partage', 'confidentialite'] as const).map((tabName) => {
              const labels: { [key: string]: string } = {
                infos: '📋 Informations',
                partage: '🔗 Partage',
                confidentialite: '🔒 Confidentialité'
              };
              return (
                <button
                  key={tabName}
                  onClick={() => {
                    setTab(tabName);
                    if (tabName === 'partage' && !qrCode) {
                      fetchQRCode();
                    }
                  }}
                  className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition ${
                    tab === tabName
                      ? 'border-slate-900 text-slate-900 bg-slate-50'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labels[tabName]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Infos Tab - EDITABLE */}
        {tab === 'infos' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Informations générales</h2>
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Nom de l'événement
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                  />
                </div>

                {/* Type & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Type d'événement
                    </label>
                    <select
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                    >
                      <option value="wedding">Mariage</option>
                      <option value="birthday">Anniversaire</option>
                      <option value="corporate">Professionnel</option>
                      <option value="festival">Festival</option>
                      <option value="party">Fête</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      name="event_date"
                      value={formData.event_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Lieu
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none text-sm"
                  />
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Message personnalisé
                  </label>
                  <textarea
                    name="custom_message"
                    value={formData.custom_message || ''}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Affichée à la place du message de bienvenue par défaut"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Partage Tab - QR CODE + URL */}
        {tab === 'partage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">QR Code de l'événement</h2>
              <p className="text-slate-600 text-sm mb-6">Partagez ce QR code pour permettre à vos invités d'ajouter leurs photos</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* QR Code Display */}
                <div className="flex flex-col items-center">
                  {qrCode ? (
                    <>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-4">
                        <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                      </div>
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={downloadQRCode}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
                        >
                          📥 Télécharger
                        </button>
                        <button
                          onClick={printQRCode}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
                        >
                          🖨️ Imprimer
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-600">Chargement du QR Code...</p>
                  )}
                </div>

                {/* URL Partage */}
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Lien de partage</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        URL de l'événement
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.slug}`}
                          readOnly
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-sm"
                        />
                        <button
                          onClick={() =>
                            copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.slug}`)
                          }
                          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-lg transition"
                        >
                          Copier
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Partagez ce lien avec vos invités pour qu'ils uploadent leurs photos
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confidentialité Tab */}
        {tab === 'confidentialite' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Paramètres de confidentialité</h2>
              
              <div className="space-y-6">
                {/* Public/Private */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Galerie publique</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {formData.is_public
                        ? 'La galerie est visible par tous'
                        : 'La galerie n\'est visible que par vous'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('is_public')}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${
                      formData.is_public
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {formData.is_public ? '✓ Publique' : 'Privée'}
                  </button>
                </div>

                {/* Require Approval */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Approbation des uploads</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {formData.require_approval
                        ? 'Vous devez approuver chaque photo avant publication'
                        : 'Les photos sont publiées automatiquement'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('require_approval')}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${
                      formData.require_approval
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {formData.require_approval ? '✓ Activée' : 'Désactivée'}
                  </button>
                </div>

                {/* Allow Uploads */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900">Téléversement par les invités</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {formData.allow_uploads
                        ? 'Les invités peuvent téléverser des photos'
                        : 'Seul vous pouvez ajouter des photos'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('allow_uploads')}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${
                      formData.allow_uploads
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {formData.allow_uploads ? '✓ Activé' : 'Désactivé'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button - STICKY */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6">
        <div className="max-w-7xl mx-auto flex justify-end gap-4">
          <Link
            href="/client/dashboard"
            className="px-6 py-3 border border-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-50 transition"
          >
            Annuler
          </Link>
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg transition"
          >
            {saveLoading ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
