'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import QRCodeContent from './qrcode-content';

export default function QRCodePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    }>
      <QRCodeContent />
    </Suspense>
  );
}
