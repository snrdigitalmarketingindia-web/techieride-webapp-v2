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
      <section className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <p className="text-brand-300 text-sm font-semibold uppercase tracking-widest mb-4">Since 2011 · For a Better Society</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight text-white">
            Connecting Professionals.<br />Empowering Communities.<br />Creating Impact.
          </h1>
          <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            TechieRide is a volunteer-driven social organization that brings together IT professionals, runners, cyclists, walkers, and changemakers to build a better society through carpooling, environmental initiatives, education support, and community service.
          </p>
          <p className="text-gray-400 text-base font-medium mb-10 italic">
            "For over 15 years, TechieRide has inspired thousands of professionals across Hyderabad to contribute beyond their workplace and become active participants in social transformation."
          </p>
          <p className="text-brand-300 font-semibold mb-8">Join a trusted community where every journey creates impact.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-brand-600 text-white px-8 py-3 rounded-xl text-base font-semibold hover:bg-brand-700 transition shadow-lg">
              Join TechieRide
            </Link>
            <Link href="/login" className="border border-gray-500 text-gray-200 px-8 py-3 rounded-xl text-base font-medium hover:border-gray-300 hover:text-white transition">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Origin story */}
      <section className="bg-amber-50 border-b border-amber-100 py-10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-2xl mb-3">🤝</p>
          <p className="text-gray-700 text-base leading-relaxed">
            What started as a small group of <span className="font-semibold text-amber-700">fewer than 10 people</span> sharing rides to work in 2011 has grown into a thriving network of{' '}
            <span className="font-semibold text-amber-700">~2,000 members</span> across Hyderabad — united by the belief that small actions, done together, create lasting change.
          </p>
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
            Started as a carpooling movement among IT professionals, TechieRide continues to promote carpooling, reduced traffic congestion, lower carbon emissions, and greener commuting practices.
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
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-10 text-white">📈 Impact Since 2011</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[
              'Thousands of Volunteers Engaged',
              'Hundreds of Community Activities',
              'Environmental Conservation Projects',
              'Education Support Programs',
              'Health & Social Welfare Initiatives',
              'Carpooling & Mobility Awareness',
            ].map((item) => (
              <div key={item} className="bg-white/10 rounded-xl px-4 py-3 text-sm font-medium text-gray-100">
                ✅ {item}
              </div>
            ))}
          </div>
          <h3 className="text-xl font-bold mb-3 text-white">Together We Can Build A Better Society</h3>
          <p className="text-gray-400 mb-8">Join TechieRide and become part of a movement that combines technology, community service, environmental responsibility, and social impact.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition shadow-lg">
              Join TechieRide
            </Link>
            <Link href="/login" className="border border-gray-500 text-gray-200 px-8 py-3 rounded-xl font-medium hover:border-gray-300 hover:text-white transition">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-12 border-t border-gray-100">
        <div className="max-w-xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">Follow Us</p>
          <div className="flex justify-center gap-6">
            {[
              { href: 'https://www.instagram.com/techieride/', label: 'Instagram', icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              ), color: 'hover:text-pink-500' },
              { href: 'https://www.facebook.com/techieride', label: 'Facebook', icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              ), color: 'hover:text-blue-600' },
              { href: 'https://www.youtube.com/@TechieRide', label: 'YouTube', icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
              ), color: 'hover:text-red-600' },
              { href: 'https://x.com/hydtechieride', label: 'X (Twitter)', icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              ), color: 'hover:text-gray-900' },
            ].map(({ href, label, icon, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                aria-label={label}
                className={`text-gray-400 transition ${color}`}>
                {icon}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 space-y-1">
        <p className="font-semibold text-gray-600">TechieRide Society</p>
        <p className="italic">"For a Better Society"</p>
        <p>Established 2011 · Hyderabad</p>
        <p className="text-xs mt-2">© 2026 TechieRide v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
      </footer>

    </main>
  );
}
