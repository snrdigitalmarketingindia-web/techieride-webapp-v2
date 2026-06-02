import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Image src="/TR_Logo_black.png" alt="TechieRide" width={40} height={40} className="object-contain" priority />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">TechieRide Society</p>
            <p className="text-xs text-gray-400">Since 2011</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-brand-600 transition px-4 py-2">
            Sign In
          </Link>
          <Link href="/signup" className="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 transition font-medium">
            Join TechieRide
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <p className="text-brand-200 text-sm font-medium uppercase tracking-widest mb-4">Since 2011 · For a Better Society</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Connecting Professionals.<br />Empowering Communities.<br />Creating Impact.
          </h1>
          <p className="text-brand-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            TechieRide is a volunteer-driven social organization that brings together IT professionals, runners, cyclists, walkers, and changemakers to build a better society through sustainable mobility, environmental initiatives, education support, and community service.
          </p>
          <p className="text-white text-base font-medium mb-10 italic">
            "For over 15 years, TechieRide has inspired thousands of professionals across Hyderabad to contribute beyond their workplace and become active participants in social transformation."
          </p>
          <p className="text-brand-100 font-semibold mb-8">Join a trusted community where every journey creates impact.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-white text-brand-700 px-8 py-3 rounded-xl text-base font-semibold hover:bg-brand-50 transition shadow-lg">
              Join TechieRide
            </Link>
            <Link href="/login" className="border border-white text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-white/10 transition">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-green-50 py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-3xl mb-4">🌱</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            To create a socially responsible community that promotes sustainable living, environmental conservation, education support, health awareness, and community development.
          </p>
        </div>
      </section>

      {/* Pillars grid */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Sustainable Mobility */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-3xl">🚘</p>
          <h3 className="text-lg font-bold text-gray-900">Sustainable Mobility</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Started as a carpooling movement among IT professionals, TechieRide continues to promote shared transportation, reduced traffic congestion, lower carbon emissions, and greener commuting practices.
          </p>
        </div>

        {/* Education */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-3xl">📚</p>
          <h3 className="text-lg font-bold text-gray-900">Education Initiatives</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">
            Supporting underprivileged students through educational assistance, fundraising, and learning opportunities for rural communities.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            {['Vidya Nidhi', 'Mile for Education', 'Rural Education Support', 'Science Awareness Camps'].map((p) => (
              <li key={p} className="flex items-center gap-2"><span className="text-green-500">•</span>{p}</li>
            ))}
          </ul>
        </div>

        {/* Environment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-3xl">🌳</p>
          <h3 className="text-lg font-bold text-gray-900">Environment & Green Earth</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">Protecting nature through large-scale environmental activities:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            {['Plantation Drives', 'Water Harvesting Pits', 'No-Polythene Campaigns', 'Forest Restoration', 'Deer Park Clean-Up Drives', 'Go Green Initiatives'].map((p) => (
              <li key={p} className="flex items-center gap-2"><span className="text-green-500">•</span>{p}</li>
            ))}
          </ul>
        </div>

        {/* Community Service */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-3xl">❤️</p>
          <h3 className="text-lg font-bold text-gray-900">Community Service</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">Making a difference through meaningful social impact programs:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            {['Blood Donation Camps', 'Health Camps', 'Chalivendram (Summer Water Service)', 'Voting Awareness Campaigns', 'Disaster & Community Support'].map((p) => (
              <li key={p} className="flex items-center gap-2"><span className="text-red-400">•</span>{p}</li>
            ))}
          </ul>
        </div>

        {/* Active Community */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-3xl">🏃</p>
          <h3 className="text-lg font-bold text-gray-900">Active Community</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">Our vibrant community participates in:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            {['Running Events', 'Walkathons', 'Cycling Activities', 'Village Rides', 'Team Bonding Activities', 'Volunteer Meetups', 'Family Social Events'].map((p) => (
              <li key={p} className="flex items-center gap-2"><span className="text-blue-400">•</span>{p}</li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 italic">Together, we build friendships, leadership, and a culture of giving back.</p>
        </div>

        {/* Partnerships */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-3xl">🤝</p>
          <h3 className="text-lg font-bold text-gray-900">Community & Partnerships</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">TechieRide collaborates with organisations to amplify social impact:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            {['Seva Bharathi', 'Dha3R Foundation', 'ASWA', 'GSF', 'KNR', 'IDO Tribal Welfare Initiatives', 'Multiple citizen volunteer groups'].map((p) => (
              <li key={p} className="flex items-center gap-2"><span className="text-purple-400">•</span>{p}</li>
            ))}
          </ul>
        </div>

      </section>

      {/* Trusted community */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-4">
          <p className="text-3xl">🔒</p>
          <h2 className="text-2xl font-bold text-gray-900">Trusted Community</h2>
          <p className="text-gray-600">Every member contributes to a positive and respectful environment built on trust, service, and social responsibility.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {['Verified Community Members', 'Safe Volunteer Network', 'Transparent Activities', 'Inclusive Participation', 'Community-Led Governance'].map((t) => (
              <span key={t} className="bg-white border border-gray-200 text-gray-700 text-sm px-4 py-1.5 rounded-full shadow-sm">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="bg-brand-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-10">📈 Impact Since 2011</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[
              'Thousands of Volunteers Engaged',
              'Hundreds of Community Activities',
              'Environmental Conservation Projects',
              'Education Support Programs',
              'Health & Social Welfare Initiatives',
              'Sustainable Mobility Awareness',
            ].map((item) => (
              <div key={item} className="bg-white/10 rounded-xl px-4 py-3 text-sm font-medium">
                ✅ {item}
              </div>
            ))}
          </div>
          <h3 className="text-xl font-bold mb-3">Together We Can Build A Better Society</h3>
          <p className="text-brand-100 mb-8">Join TechieRide and become part of a movement that combines technology, community service, environmental responsibility, and social impact.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-white text-brand-700 px-8 py-3 rounded-xl font-semibold hover:bg-brand-50 transition shadow-lg">
              Join TechieRide
            </Link>
            <Link href="/login" className="border border-white text-white px-8 py-3 rounded-xl font-medium hover:bg-white/10 transition">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 text-gray-400 text-sm border-t border-gray-100 space-y-1">
        <p className="font-semibold text-gray-600">TechieRide Society</p>
        <p className="italic">"For a Better Society"</p>
        <p>Established 2011 · Hyderabad</p>
        <p className="text-xs mt-2">© 2026 TechieRide v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
      </footer>

    </main>
  );
}
