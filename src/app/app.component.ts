import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError
} from '@angular/router';
import { LoadingService } from './service/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  loadingVisible = false;

  // états permissions (pour bannières UI)
  cameraGranted = false;
  cameraDenied = false;
  locationGranted = false;
  locationDenied = false;

  constructor(private router: Router, private loading: LoadingService) {
    this.loading.visible$.subscribe(v => (this.loadingVisible = v));

    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart) this.loading.show();
      if (
        ev instanceof NavigationEnd ||
        ev instanceof NavigationCancel ||
        ev instanceof NavigationError
      ) {
        this.loading.hide();
      }
    });

    // Re-demande permissions quand l'app revient au premier plan
    // (continue de forcer la demande ; si refus définitif, on affiche l'aide)
    // note: on ne tente plus d'ouvrir automatiquement les réglages système
    // depuis le code.
    (window as any).document?.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => this.requestAllPermissions(), 250);
      }
    });
  }

  async ngOnInit() {
    // Demander à chaque lancement (force request)
    await this.requestAllPermissions();
  }

  private async requestAllPermissions() {
    await Promise.all([this.requestCameraPermission(), this.requestLocationPermission()]);
  }

  async retryCamera() {
    await this.requestCameraPermission();
  }

  async retryLocation() {
    await this.requestLocationPermission();
  }

  private async requestCameraPermission() {
    this.cameraDenied = false;
    this.cameraGranted = false;

    try {
      const res = await Camera.requestPermissions();
      const anyRes: any = res;
      if (anyRes?.camera === 'granted' || anyRes?.camera === 'limited') {
        this.cameraGranted = true;
        this.cameraDenied = false;
      } else if (typeof res === 'string' && (res === 'granted' || res === 'limited')) {
        this.cameraGranted = true;
        this.cameraDenied = false;
      } else {
        this.cameraGranted = false;
        this.cameraDenied = true;
      }
    } catch (e) {
      console.warn('[AppComponent] requestCameraPermission error', e);
      this.cameraGranted = false;
      this.cameraDenied = true;
    }
  }

  private async requestLocationPermission() {
    this.locationDenied = false;
    this.locationGranted = false;

    try {
      const res = await Geolocation.requestPermissions();
      let granted = false;

      if (typeof res === 'string') {
        granted = res === 'granted';
      } else if (res && typeof res === 'object') {
        const anyRes: any = res;
        if ('location' in anyRes) {
          const loc = anyRes.location;
          granted = loc === 'granted' || loc === 'when-in-use' || loc === 'always';
        } else if ('permission' in anyRes) {
          granted = anyRes.permission === 'granted';
        } else {
          granted = false;
        }
      }

      if (granted) {
        this.locationGranted = true;
        this.locationDenied = false;
      } else {
        this.locationGranted = false;
        this.locationDenied = true;
      }
    } catch (e) {
      try {
        await Geolocation.getCurrentPosition({ timeout: 3000 });
        this.locationGranted = true;
        this.locationDenied = false;
      } catch {
        console.warn('[AppComponent] requestLocationPermission failed', e);
        this.locationGranted = false;
        this.locationDenied = true;
      }
    }
  }
}