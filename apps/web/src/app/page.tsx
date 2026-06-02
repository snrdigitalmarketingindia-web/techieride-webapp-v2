import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Image src="/TR_Logo_black.png" alt="TechieRide" width={40} height={40} className="object-contain" priority />
          <span className="text-xs font-medium text-orange-400">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-brand-600 transition">
            Login
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <span>🔒</span> Verified IT employees only
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Carpool with your <span className="text-brand-600">tribe</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          A safe, recurring commute network for Hyderabad IT professionals.
          Share rides with verified colleagues. Save money, reduce traffic, earn ECO points.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-brand-600 text-white px-8 py-3 rounded-xl text-lg font-medium hover:bg-brand-700 transition shadow-lg"
          >
            Join Techieride
          </Link>
          <Link
            href="/login"
            className="border border-brand-300 text-brand-700 px-8 py-3 rounded-xl text-lg font-medium hover:bg-brand-50 transition"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        {[
          { icon: '✅', title: 'Verified Members', desc: 'Every member is a verified IT employee. Employee ID + company email required.' },
          { icon: '🔄', title: 'Recurring Commutes', desc: 'Set up your daily route once. Auto-matched with colleagues who share your route.' },
          { icon: '🛡️', title: 'Safety First', desc: 'Live tracking, SOS button, emergency contacts, and admin oversight on every ride.' },
          { icon: '🗺️', title: 'OpenStreetMap', desc: 'Free, open maps. No Google dependency. Route visualization and live tracking.' },
          { icon: '🌱', title: 'ECO Points', desc: 'Earn points for every ride. Track your CO₂ savings. Climb the leaderboard.' },
          { icon: '💸', title: 'Zero Cost Infra', desc: 'Built on 100% open-source stack. Costs near zero at launch.' },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-600 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center py-10 text-gray-400 text-sm border-t border-gray-100">
        © 2026 Techieride v{process.env.NEXT_PUBLIC_APP_VERSION} · Built for Hyderabad IT professionals
      </footer>
    </main>
  );
}
