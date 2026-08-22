'use client';

export const dynamic = 'force-dynamic';  // ← AJOUTER CETTE LIGNE

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function QRCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [clientId, setClientId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [accessUrl, setAccessUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('clientId');
    if (!id) {
      router.push('/client/login');
    } else {
      setClientId(id);
      if (eventId) {
        fetchQRCode(eventId);
      } else {
        setError('Événement non spécifié');
        setLoading(false);
      }
    }
  }, [eventId, router]);

  const fetchQRCode = async (id: string) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/client/events/${id}/qrcode`
      );

      if (response.data.success) {
        setQrCode(response.data.data.qrCode);
        setEventTitle(response.data.data.title);
        setAccessUrl(response.data.data.accessUrl);
      } else {
        setError(response.data.error || 'Erreur lors de la génération');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur serveur');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qrcode-${eventTitle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accessUrl);
    alert('✓ Lien copié !');
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
            QR Code
          </h1>
          <p className="text-slate-600">Partagez ce code avec vos invités</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-600">Génération du QR code...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-lg mb-8">
            ✕ {error}
          </div>
        )}

        {!loading && !error && qrCode && (
          <div className="space-y-8">
            {/* Event Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{eventTitle}</h2>
              <p className="text-slate-600">
                Scannez ce code avec votre téléphone ou partagez le lien ci-dessous
              </p>
            </div>

            {/* QR Code Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            </div>

            {/* Access Link */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Lien d'accès
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accessUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition duration-200"
                >
                  Copier
                </button>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadQRCode}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition duration-200"
            >
              Télécharger QR Code (PNG)
            </button>

            {/* Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
              <p>
                💡 Partagez ce QR code avec vos invités. Ils pourront scanner et uploader leurs photos
                directement depuis leur téléphone, sans application à installer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}