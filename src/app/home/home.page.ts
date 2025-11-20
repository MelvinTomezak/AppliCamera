import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PhotoService, Photo } from '../service/photo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit {
  favorites: Photo[] = [];

  constructor(
    private router: Router,
    private photos: PhotoService
  ) {}

  async ngOnInit() {
    await this.refreshFavorites();
  }

  // si tu utilises Ionic tabs, c’est pratique de rafraîchir quand on revient sur l’écran
  async ionViewWillEnter() {
    await this.refreshFavorites();
  }

  private async refreshFavorites() {
    try {
      await this.photos.load();
    } catch {
      // ignore si aucune photo encore
    }
    const all = this.photos.getAll();
    this.favorites = all.filter(p => !!p.liked);
  }

  // ✅ navigation via Router comme dans ta version de départ
  openCamera()  { this.router.navigate(['/tabs/camera']).catch(() => {}); }
  openGallery() { this.router.navigate(['/tabs/gallery']).catch(() => {}); }
  openMap()     { this.router.navigate(['/tabs/map']).catch(() => {}); }

  // à adapter si tu as une page "détail" ; sinon renvoie vers la galerie
  viewPhoto(_id: string) {
    this.router.navigate(['/tabs/gallery']).catch(() => {});
  }
}
