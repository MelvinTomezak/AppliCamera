import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GeoService {
  /**
   * Retourne une adresse lisible à partir de lat/lng (Nominatim).
   * Renvoie null si l'API ne répond pas.
   */
  async reverse(lat: number, lng: number): Promise<string | null> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '14');
      url.searchParams.set('addressdetails', '1');

      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          // Nominatim demande un User-Agent identifiable
          'User-Agent': 'AppliCamera/1.0 (cours-dev-mobile; contact@example.com)'
        }
      });

      if (!res.ok) return null;
      const data = await res.json();
      // display_name est souvent verbeux — on peut le simplifier si besoin
      return data?.display_name || null;
    } catch {
      return null;
    }
  }
}
