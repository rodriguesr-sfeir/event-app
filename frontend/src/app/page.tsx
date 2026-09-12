'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Epik Events" className="h-18 w-auto" />
          </Link>
          <div className="flex gap-4">
            <Link
              href="/client/login"
              className="px-6 py-2 text-slate-900 font-medium hover:text-slate-600 transition"
            >
              Connexion
            </Link>
            <Link
              href="/client/signup"
              className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition"
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            Capturez chaque moment
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-slate-900">
              de vos événements
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Epik Events vous permet de partager facilement vos photos d'événement avec vos invités. 
            Un QR code, c'est tout ce dont vous avez besoin pour une galerie collaborative et mémorable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/client/login"
              className="px-8 py-4 border-2 border-slate-900 text-slate-900 font-semibold rounded-lg hover:bg-slate-50 transition text-lg"
            >
              Connexion
            </Link>
            <Link
              href="/client/signup"
              className="px-8 py-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition text-lg"
            >
              Commencer
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Comment ça marche
            </h2>
            <p className="text-xl text-slate-600">
              Trois étapes simples pour des souvenirs partagés
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div
              className="bg-white p-8 rounded-2xl border-2 border-transparent hover:border-slate-900 transition cursor-pointer"
              onMouseEnter={() => setHoveredFeature(0)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Créez votre événement
              </h3>
              <p className="text-slate-600">
                En quelques clics, créez un nouvel événement et personnalisez ses paramètres.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="bg-white p-8 rounded-2xl border-2 border-transparent hover:border-slate-900 transition cursor-pointer"
              onMouseEnter={() => setHoveredFeature(1)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Partagez le QR code
              </h3>
              <p className="text-slate-600">
                Générez un QR code unique et partagez-le avec vos invités via SMS, email ou impression.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="bg-white p-8 rounded-2xl border-2 border-transparent hover:border-slate-900 transition cursor-pointer"
              onMouseEnter={() => setHoveredFeature(2)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Collectez les photos
              </h3>
              <p className="text-slate-600">
                Vos invités scannent le code et uploadent leurs photos. Une galerie instantanée se crée automatiquement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Tous vos souvenirs au même endroit
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <p className="text-slate-600 text-lg">
                    <strong>Galerie collaborative</strong> - Centralisez toutes les photos de vos invités
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <p className="text-slate-600 text-lg">
                    <strong>Facile à partager</strong> - Un simple QR code, c'est tout
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <p className="text-slate-600 text-lg">
                    <strong>Aucune application</strong> - Pas besoin d'installer une app
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex-shrink-0 flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <p className="text-slate-600 text-lg">
                    <strong>Téléchargez tout</strong> - Récupérez toutes vos photos en ZIP
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl h-96 flex items-center justify-center text-white text-center p-8">
              <div>
                <div className="text-6xl mb-4">📸</div>
                <p className="text-xl font-semibold">Votre galerie personnalisée</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à capturer l'essence de vos événements ?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Créez votre premier événement dès aujourd'hui et commencez à collecter vos souvenirs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/client/login"
              className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-slate-800 transition text-lg"
            >
              Connexion
            </Link>
            <Link
              href="/client/signup"
              className="px-8 py-4 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition text-lg"
            >
              Commencer
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <img src="/images/logo.png" alt="Epik Events" className="h-8 w-auto" />
              <span className="font-semibold text-slate-900">Epik Events</span>
            </div>
            <div className="text-slate-600 text-sm">
              © 2026 Epik Events. Tous droits réservés.
            </div>
            <div className="flex gap-6 text-slate-600">
              <Link href="/client/login" className="hover:text-slate-900 transition">
                Connexion
              </Link>
              <Link href="/client/signup" className="hover:text-slate-900 transition">
                S'inscrire
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
