'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

interface UploadStatus {
  fileName: string;
  progress: number;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export default function UploadContent() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get('eventSlug') || 'test-event';
  const eventId = searchParams.get('eventId');

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
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

  // Auto-dismiss messages d'erreur après 5 secondes
  useEffect(() => {
    if (uploadStatuses.length === 0) return;

    const hasLoadingStatus = uploadStatuses.some(s => s.status === 'loading');
    if (hasLoadingStatus) return;

    const timer = setTimeout(() => {
      // Nettoyer les statuts après que l'upload soit terminé
      setUploadStatuses([]);
      setIsUploading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [uploadStatuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert('Veuillez sélectionner au moins une photo');
      return;
    }

    setIsUploading(true);

    // Initialiser les statuts de chaque fichier
    const initialStatuses: UploadStatus[] = selectedFiles.map((file) => ({
      fileName: file.name,
      progress: 0,
      status: 'loading'
    }));
    setUploadStatuses(initialStatuses);
    setSuccessMessage('');
    setSuccessCount(0);

    let successfulUploads = 0;

    // Upload chaque photo
    for (let i = 0; i < selectedFiles.length; i++) {
      try {
        const formData = new FormData();
        formData.append('photo', selectedFiles[i]);
        formData.append('description', i === 0 ? description : '');

        const response = await axios.post(
          `http://localhost:5000/api/guest/${eventSlug}/photos`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        if (response.data.success) {
          successfulUploads++;

          // Mettre à jour le statut à succès
          setUploadStatuses((prevStatuses) =>
            prevStatuses.map((status, idx) =>
              idx === i
                ? { ...status, progress: 100, status: 'success' as const }
                : status
            )
          );
        } else {
          // Erreur du serveur
          const errorMessage =
            response.data.error || 'Erreur lors de l\'upload';
          setUploadStatuses((prevStatuses) =>
            prevStatuses.map((status, idx) =>
              idx === i
                ? {
                    ...status,
                    status: 'error' as const,
                    error: errorMessage
                  }
                : status
            )
          );
        }
      } catch (error: any) {
        // Vérifier si c'est une erreur de doublon
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          'Erreur lors de l\'upload';

        setUploadStatuses((prevStatuses) =>
          prevStatuses.map((status, idx) =>
            idx === i
              ? {
                  ...status,
                  status: 'error' as const,
                  error: errorMessage
                }
              : status
          )
        );
      }
    }

    // Afficher le message de succès
    if (successfulUploads > 0) {
      const message =
        successfulUploads === 1
          ? 'Succès, 1 photo a bien été ajoutée à votre galerie'
          : `Succès, ${successfulUploads} photos ont bien été ajoutées à votre galerie`;

      setSuccessMessage(message);
      setSuccessCount(successfulUploads);

      // Réinitialiser après 5 secondes
      setTimeout(() => {
        setSelectedFiles([]);
        setDescription('');
        setUploadStatuses([]);
        setIsUploading(false);
      }, 5000);
    } else {
      // Si aucun succès, mais des erreurs, garder les statuts visibles
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            📸
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-slate-50 to-white py-20 px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Partagez vos souvenirs
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Uploadez une ou plusieurs photos en quelques secondes. Tous les invités pourront les voir en temps réel.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-lg text-center font-semibold animate-pulse">
                ✓ {successMessage}
              </div>
            </div>
          )}

          {/* Upload Form */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
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
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition duration-200"
              >
                {isUploading ? 'Upload en cours...' : 'Uploader les photos'}
              </button>
            </form>

            {/* Upload Progress */}
            {uploadStatuses.length > 0 && (
              <div className="mt-12 space-y-6">
                <h3 className="text-lg font-semibold text-slate-900">Progression des uploads</h3>

                {uploadStatuses.map((status, index) => (
                  <div key={index} className="space-y-2">
                    {/* Nom du fichier et statut */}
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
                        {status.status === 'pending' && ''}
                      </span>
                    </div>

                    {/* Barre de progression */}
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

                    {/* Message d'erreur */}
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
        </div>
      </div>

      {/* Footer with Gallery Button */}
      <div className="border-t border-slate-200 py-8 px-6 mt-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-slate-600 text-sm">
              💡 Partagez ce lien avec vos invités pour qu'ils ajoutent leurs photos aussi.
            </p>
          </div>
          <div className="text-center">
            {eventSlug && eventId ? (
              <Link
                href={`/gallery?eventSlug=${eventSlug}&eventId=${eventId}`}
                className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-3 rounded-lg transition"
              >
                🖼️ Voir la galerie
              </Link>
            ) : (
              <button
                disabled
                className="inline-block bg-slate-400 text-white font-semibold px-8 py-3 rounded-lg cursor-not-allowed"
              >
                🖼️ Chargement...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
