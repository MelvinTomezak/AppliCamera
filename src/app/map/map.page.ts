import { Component, ElementRef, ViewChild, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonFab, IonFabButton, IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { PhotoService, Photo } from '../service/photo.service';
import { Geolocation } from '@capacitor/geolocation';
import { GeoService } from '../service/geo.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, IonContent, IonFab, IonFabButton, IonIcon, IonButton, IonSpinner],
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss']
})
export class MapPage implements AfterViewInit, OnDestroy {
  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private svc = inject(PhotoService);
  private geo = inject(GeoService);
  private destroyed = false;

  // Lightbox (mêmes états que Galerie)
  lightboxOpen = false;
  selectedPhoto: Photo | null = null;
  geocoding = false;

  async ngAfterViewInit() {
    if (!this.mapEl?.nativeElement) return;

    // init Leaflet
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true }).setView([48.8566, 2.3522], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    // centre sur position utilisateur si possible
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      if (pos?.coords) {
        this.map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
          radius: 6, color: '#2f80ed', fillColor: '#2f80ed', fillOpacity: 0.9
        })
          .addTo(this.map)
          .bindTooltip('Vous êtes ici', { permanent: false, direction: 'top' });
      }
    } catch (e) {
      console.warn('[MapPage] GPS non disponible :', e);
    }

    await this.refreshMarkers();

    // évite affichage tronqué
    setTimeout(() => this.map.invalidateSize(), 200);

    // rafraîchir à l'entrée de la page
    (this as any).ionViewDidEnter = async () => {
      if (this.destroyed) return;
      await this.refreshMarkers();
      setTimeout(() => this.map.invalidateSize(), 50);
    };
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.map) {
      try { this.map.remove(); } catch { /* ignore */ }
    }
  }

  async onLocate() {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
      if (pos?.coords && this.map) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.map.setView([lat, lng], 15, { animate: true });
        L.circleMarker([lat, lng], { radius: 6, color: '#2f80ed', fillColor: '#2f80ed', fillOpacity: 0.9 })
          .addTo(this.map)
          .bindTooltip('Vous êtes ici')
          .openTooltip();
      }
    } catch (e) {
      console.warn('[MapPage] onLocate failed', e);
    }
  }

  private async refreshMarkers() {
    try {
      if (typeof this.svc.load === 'function') await this.svc.load();
    } catch (e) {
      console.warn('[MapPage] photo service load failed', e);
    }
    const photos = this.svc.getAll?.() || [];
    this.renderPhotoMarkers(photos);
  }

 private renderPhotoMarkers(photos: Photo[]) {
  if (!this.markersLayer) {
    this.markersLayer = L.layerGroup().addTo(this.map);
  }
  this.markersLayer.clearLayers();

  const bucketCount = new Map<string, number>();
  const EPS = 1e-5;
  const keyOf = (lat: number, lng: number) =>
    `${(lat / EPS >> 0) * EPS},${(lng / EPS >> 0) * EPS}`;

  for (const p of photos) {
    if (!p.coords) continue;
    const baseLat = p.coords.lat;
    const baseLng = p.coords.lng;
    const key = keyOf(baseLat, baseLng);
    const index = (bucketCount.get(key) ?? 0) + 1;
    bucketCount.set(key, index);

    const angle = (index - 1) * (Math.PI / 3);
    const ring = Math.ceil(index / 6);
    const radiusDeg = 0.00012 * ring;
    const jitterLat = baseLat + (Math.cos(angle) * radiusDeg);
    const jitterLng = baseLng + (Math.sin(angle) * radiusDeg);

    const marker = L.marker([jitterLat, jitterLng]).addTo(this.markersLayer);

    // ✅ Survol : affiche un petit aperçu de la photo
    const previewHtml = `
      <div class="map-photo-preview">
        <img src="${p.webPath || ''}" alt="aperçu" />
      </div>
    `;
    marker.bindTooltip(previewHtml, {
      permanent: false,
      direction: 'top',
      opacity: 1,
      className: 'photo-tooltip'
    });

    // ✅ Clic : ouvre la lightbox complète
    marker.on('click', () => this.openLightbox(p));
  }
}


  // -------- Lightbox (mêmes comportements que Galerie) ----------
  openLightbox(p: Photo) {
    this.selectedPhoto = p;
    this.lightboxOpen = true;

    // reverse geocoding si coords et pas encore d'adresse
    if (p.coords && !p.address) {
      this.geocoding = true;
      this.geo.reverse(p.coords.lat, p.coords.lng)
        .then(addr => addr ? this.svc.patch(p.id, { address: addr }) : null)
        .then(() => {
          const updated = this.svc.getById(p.id);
          if (updated) this.selectedPhoto = updated;
        })
        .finally(() => this.geocoding = false);
    }
  }

  closeLightbox() {
    this.lightboxOpen = false;
    this.selectedPhoto = null;
  }

  async onDelete(p: Photo | null, ev?: Event) {
    ev?.stopPropagation();
    if (!p) return;
    await this.svc.remove(p.id);
    await this.refreshMarkers();
    if (this.selectedPhoto?.id === p.id) this.closeLightbox();
  }

  async onToggleLike(p: Photo | null, ev?: Event) {
    ev?.stopPropagation();
    if (!p) return;
    await this.svc.toggleLike(p.id);
    // pas nécessaire de recharger les marqueurs pour un like
    const updated = this.svc.getById(p.id);
    if (updated) this.selectedPhoto = updated;
  }
}
