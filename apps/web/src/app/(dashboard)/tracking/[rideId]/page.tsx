'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ridesApi } from '@/lib/api';
import { ContactCard } from '@/components/ui/ContactCard';

const LiveTrackingMap = dynamic(() => import('@/components/maps/LiveTrackingMap'), { ssr: false });

export default function TrackingPage({ params }: { params: { rideId: string } }) {
  const searchParams = useSearchParams();
  const isGiver = searchParams.get('giver') === 'true';
  const [sos, setSos] = useState(false);
  const [ride, setRide] = useState<any>(null);

  useEffect(() => {
    ridesApi.getById(params.rideId).then(r => setRide(r.data)).catch(() => {});
  }, [params.rideId]);

  const triggerSos = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { api } = await import('@/lib/api');
        await api.post('/sos', {
          rideId: params.rideId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setSos(true);
        alert('🆘 SOS triggered. Emergency contacts notified.');
      } catch {
        alert('Failed to trigger SOS. Call 112 directly.');
      }
    });
  };

  const giver = ride?.rideGiver;
  const giverUser = giver?.user;
  const participants = ride?.participants ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {isGiver ? '📡 Broadcasting Location' : '📍 Live Tracking'}
        </h1>
        <button
          onClick={triggerSos}
          disabled={sos}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          🆘 {sos ? 'SOS Sent' : 'SOS'}
        </button>
      </div>

      {isGiver && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
          ✅ Your location is being shared with passengers in real-time
        </div>
      )}

      <div className="h-[50vh] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <LiveTrackingMap
          rideId={params.rideId}
          isGiver={isGiver}
        />
      </div>

      {/* Contact cards — giver sees seekers, seeker sees giver */}
      {ride && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">📞 Trip Contacts</h2>

          {/* Seeker view: show giver contact */}
          {!isGiver && giverUser && (
            <ContactCard
              userId={giver.userId}
              name={giverUser.fullName}
              company={giverUser.companyName}
              phone={giverUser.phone}
              countryCode={giverUser.countryCode}
              rating={giver.averageRating}
              totalRides={giver.totalRidesGiven}
              role="RIDE_GIVER"
              rideId={params.rideId}
              variant="full"
            />
          )}

          {/* Giver view: show all seeker contacts */}
          {isGiver && participants.length > 0 && (
            <div className="space-y-2">
              {participants.map((p: any) => {
                const su = p.seeker?.user;
                if (!su) return null;
                return (
                  <ContactCard
                    key={p.id}
                    userId={p.seeker.userId}
                    name={su.fullName}
                    company={su.companyName}
                    phone={su.phone}
                    countryCode={su.countryCode}
                    role="RIDE_SEEKER"
                    rideId={params.rideId}
                    variant="compact"
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-1">Ride ID</p>
        <p className="text-xs text-gray-400 font-mono">{params.rideId}</p>
      </div>
    </div>
  );
}
