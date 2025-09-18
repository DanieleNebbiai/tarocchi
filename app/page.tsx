"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Star, Clock, Shield, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import Header from "@/components/header";
import AuthModal from "@/components/auth-modal";
import PaymentModal from "@/components/payment-modal";

export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-terracotta-50 to-earth-50">
      <Header onAuthClick={() => setShowAuth(true)} />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sage-200/30 via-terracotta-200/20 to-earth-200/30" />
        <div className="floating-particles absolute inset-0" />

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="mystical-glow mb-8">
            <span className="text-8xl animate-pulse">⭐️</span>
          </div>

          <h1 className="font-playfair text-5xl md:text-7xl font-bold text-earth-900 mb-6 animate-fade-in tracking-tight">
            Scegli il tuo Mazzo, <br /> Trasforma il tuo Destino
          </h1>

          <p className="text-xl md:text-2xl text-earth-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Con la nostra piattaforma 24/7, hai accesso a consulti di tarocchi
            personalizzati in qualsiasi momento. Ogni mazzo ha un carattere
            unico: scegli quello che risuona con te e lasciati guidare dalle
            carte.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/consulto">
              <Button
                size="lg"
                className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-glow"
              >
                <Phone className="mr-2 h-5 w-5" />
                Leggi il Futuro
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-earth-600">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span>4.9/5 stelle</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-sage-600" />
              <span>Disponibili 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-terracotta-600" />
              <span>Sistema Intelligente</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-earth-100 to-sage-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-playfair text-4xl font-bold text-earth-900 mb-8">
            Stanca di Tarocchi che confondono?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 bounce-once">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">💔</div>
                <h3 className="font-semibold text-earth-800 mb-2">
                  Manipolazioni
                </h3>
                <p className="text-earth-600">
                  Ti dicono quello che vuoi sentirti dire per tenerti più a
                  lungo
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 bounce-once"
              style={{ animationDelay: "0.2s" }}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="font-semibold text-earth-800 mb-2">
                  Costi Eccessivi
                </h3>
                <p className="text-earth-600">
                  Numeri a pagamento che prosciugano il portafoglio
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 bounce-once"
              style={{ animationDelay: "0.4s" }}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">😵‍💫</div>
                <h3 className="font-semibold text-earth-800 mb-2">
                  Più Confusa
                </h3>
                <p className="text-earth-600">
                  Ti senti più spaesata dopo la chiamata che prima
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-4xl font-bold text-earth-900 mb-6">
              Tarocchi.cloud è la Rivoluzione
            </h2>
            <p className="text-xl text-earth-700 max-w-3xl mx-auto">
              Un sistema intelligente che sfrutta testi oggettivi della
              letteratura esoterica per risposte vere, coerenti e immediate.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-sage-500 to-sage-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 mystical-glow">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-earth-800 mb-2">
                Risposte Immediate
              </h3>
              <p className="text-earth-600">
                Quando ne hai più bisogno, subito
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-terracotta-500 to-terracotta-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 mystical-glow">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-earth-800 mb-2">
                Nessuna Manipolazione
              </h3>
              <p className="text-earth-600">
                Solo risposte scientificamente strutturate
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-earth-500 to-earth-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 mystical-glow">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-earth-800 mb-2">
                Sempre Disponibile
              </h3>
              <p className="text-earth-600">
                Sistema cloud: preciso, accessibile ovunque
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-sage-600 to-terracotta-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 mystical-glow">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-earth-800 mb-2">
                Consulti Illimitati
              </h3>
              <p className="text-earth-600">30 giorni gratis, poi 22€/mese</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gradient-to-br from-sage-50 to-terracotta-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-4xl font-bold text-earth-900 mb-6">
              Come Funziona
            </h2>
            <p className="text-xl text-earth-700">
              Tre semplici passi per ottenere le risposte che cerchi
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center relative">
              <div className="bg-gradient-to-br from-sage-500 to-sage-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl mystical-glow">
                1
              </div>
              <h3 className="font-semibold text-earth-800 mb-4 text-xl">
                Prova Gratis
              </h3>
              <p className="text-earth-600">
                30 giorni completamente gratuiti per testare il sistema
              </p>
              {/* Connecting line */}
              <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-gradient-to-r from-sage-300 to-terracotta-300 transform translate-x-6" />
            </div>

            <div className="text-center relative">
              <div className="bg-gradient-to-br from-terracotta-500 to-terracotta-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl mystical-glow">
                2
              </div>
              <h3 className="font-semibold text-earth-800 mb-4 text-xl">
                Fai le Tue Domande
              </h3>
              <p className="text-earth-600">
                Consulti illimitati, quando vuoi, senza attese
              </p>
              {/* Connecting line */}
              <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-gradient-to-r from-terracotta-300 to-earth-300 transform translate-x-6" />
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-earth-500 to-earth-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl mystical-glow">
                3
              </div>
              <h3 className="font-semibold text-earth-800 mb-4 text-xl">
                Ricevi Risposte Vere
              </h3>
              <p className="text-earth-600">
                Interpretazioni scientifiche basate sulla tradizione autentica
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-earth-50 to-sage-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-4xl font-bold text-earth-900 mb-6">
              Recensioni Autentiche
            </h2>
            <p className="text-xl text-earth-700">
              Cosa dicono i nostri utenti
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-sage-500 to-sage-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-4 w-4 text-yellow-500 fill-current"
                    />
                  ))}
                </div>
              </div>
              <p className="text-earth-700 mb-4 italic text-sm leading-relaxed">
                "Mi ha aiutato senza chiedermi nulla in cambio. Finalmente ho
                trovato risposte oneste."
              </p>
              <div className="text-xs text-earth-500">
                <p className="font-medium">Lucia, 54 anni</p>
                <p>Verificata ✓</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-4 w-4 text-yellow-500 fill-current"
                    />
                  ))}
                </div>
              </div>
              <p className="text-earth-700 mb-4 italic text-sm leading-relaxed">
                "È subito diverso il mio riferimento onestissimo. Niente più
                truffe telefoniche."
              </p>
              <div className="text-xs text-earth-500">
                <p className="font-medium">Marco, 62 anni</p>
                <p>Verificata ✓</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-earth-500 to-earth-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-4 w-4 text-yellow-500 fill-current"
                    />
                  ))}
                </div>
              </div>
              <p className="text-earth-700 mb-4 italic text-sm leading-relaxed">
                "Con Tarocchi.cloud mi sono sentita ascoltata e capita. Risposte
                precise."
              </p>
              <div className="text-xs text-earth-500">
                <p className="font-medium">Giulia, 37 anni</p>
                <p>Verificata ✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-4 bg-earth-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-playfair text-3xl font-bold mb-12">
            Perché Scegliere Tarocchi.cloud
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="floating">
              <div className="text-4xl font-bold text-sage-400 mb-2">∞</div>
              <p className="text-earth-200">Consulti Illimitati</p>
            </div>
            <div className="floating" style={{ animationDelay: "0.2s" }}>
              <div className="text-4xl font-bold text-terracotta-400 mb-2">
                24/7
              </div>
              <p className="text-earth-200">Sempre Attivo</p>
            </div>
            <div className="floating" style={{ animationDelay: "0.4s" }}>
              <div className="text-4xl font-bold text-sage-400 mb-2">30</div>
              <p className="text-earth-200">Giorni Gratis</p>
            </div>
            <div className="floating" style={{ animationDelay: "0.6s" }}>
              <div className="text-4xl font-bold text-terracotta-400 mb-2">
                22€
              </div>
              <p className="text-earth-200">Prezzo Fisso/Mese</p>
            </div>
          </div>
        </div>
      </section>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
      />
    </div>
  );
}
