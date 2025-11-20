import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSegment, IonSegmentButton, IonLabel,
  IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonIcon,
  IonButton, IonSpinner
} from '@ionic/angular/standalone';

import { PhotoService, Photo } from '../service/photo.service';
import { GeoService } from '../service/geo.service';

type Album = 'all' | 'fav';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSegment, IonSegmentButton, IonLabel,
    IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonIcon,
    IonButton, IonSpinner
  ],
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.scss']
})
export class GalleryPage {
  photos: Photo[] = [];
  album: Album = 'all';

  // Lightbox
  lightboxOpen = false;
  selectedPhoto: Photo | null = null;
  geocoding = false;

  constructor(private svc: PhotoService, private geo: GeoService) {}

  async ngOnInit() {
    await this.loadPhotos();
  }

  async ionViewWillEnter() {
    await this.loadPhotos();
  }

  private async loadPhotos() {
    await this.svc.load().catch(() => {});
    this.photos = this.svc.getAll();
  }

  // --- Albums ---
  onAlbumChange(ev: CustomEvent) {
    const next = (ev.detail as any).value as Album;
    this.album = next;
  }

  filteredPhotos(): Photo[] {
    return this.album === 'fav' ? this.photos.filter(p => !!p.liked) : this.photos;
  }

  // --- Actions carte ---
  openLightbox(p: Photo, ev?: Event) {
    ev?.stopPropagation();
    this.selectedPhoto = p;
    this.lightboxOpen = true;

    // reverse geocoding si nécessaire (non bloquant pour l'ouverture)
    if (p.coords && !p.address) {
      this.geocoding = true;
      this.geo.reverse(p.coords.lat, p.coords.lng)
        .then(addr => addr ? this.svc.patch(p.id, { address: addr }) : null)
        .then(() => {
          // refresh références locales
          const updated = this.svc.getById(p.id);
          if (updated) this.selectedPhoto = updated;
          this.photos = [...this.svc.getAll()];
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
    this.photos = [...this.svc.getAll()];
    if (this.selectedPhoto?.id === p.id) this.closeLightbox();
  }

  async onToggleLike(p: Photo | null, ev?: Event) {
    ev?.stopPropagation();
    if (!p) return;
    await this.svc.toggleLike(p.id);
    this.photos = [...this.svc.getAll()];
    if (this.selectedPhoto?.id === p.id) {
      this.selectedPhoto = this.svc.getById(p.id) ?? null;
    }
  }

  // Fermer avec Echap
  @HostListener('document:keydown.escape')
  onEsc() { if (this.lightboxOpen) this.closeLightbox(); }

  // --- Helpers affichage ---
  shortInfo(p: Photo): string {
    const date = new Date(p.createdAt);
    const d = date.toLocaleDateString();
    const t = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const place = p.address
      ? p.address
      : p.coords
        ? `${p.coords.lat.toFixed(5)}, ${p.coords.lng.toFixed(5)}`
        : 'Lieu indisponible';
    return `${d} · ${t} · ${place}`;
  }
}
