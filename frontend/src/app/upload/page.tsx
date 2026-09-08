'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import UploadContent from './upload-content';

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}