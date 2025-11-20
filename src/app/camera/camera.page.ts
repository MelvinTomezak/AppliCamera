import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PhotoService } from '../service/photo.service';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './camera.page.html',
  styleUrls: ['./camera.page.scss']
})
export class CameraPage implements OnInit {
  previewOpen = false;
  previewUrl: string | null = null;
  private tempBase64: string | null = null;

  isSaving = false;
  isBusy = false;

  cameraDenied = false;
  locationDenied = false;

  constructor(private photos: PhotoService, private router: Router) {}

  ngOnInit(): void {
    this.checkPermissionsState();
  }

  private async checkPermissionsState() {
    try {
      const cam = await Camera.checkPermissions();
      this.cameraDenied = !(cam?.camera === 'granted' || cam?.camera === 'limited');
    } catch {
      this.cameraDenied = true;
    }

    try {
      const res: any = await Geolocation.requestPermissions();
      let granted = false;
      if (typeof res === 'string') {
        granted = res === 'granted';
      } else if (res && typeof res === 'object') {
        if ('location' in res)
          granted = ['granted', 'when-in-use', 'always'].includes(res.location);
        else if ('permission' in res)
          granted = res.permission === 'granted';
      }
      this.locationDenied = !granted;
    } catch {
      this.locationDenied = true;
    }
  }

  /** ✅ Prendre une photo (corrigé pour éviter le blocage après annulation) */
  async onTake() {
    if (this.isBusy) return;
    this.isBusy = true;

    try {
      const isNative = Capacitor.isNativePlatform();

      let res = null;
      try {
        // ⚡ Appel direct à la caméra ou au prompt navigateur
        res = await this.photos.takeAndPreview(!isNative);
      } catch (svcErr) {
        console.warn('[CameraPage] takeAndPreview erreur:', svcErr);
      }

      // Si annulation (croix ou retour), on ne fait rien et on sort
      if (!res) {
        console.log('[CameraPage] Prise de vue annulée par l’utilisateur');
        return;
      }

      // Sinon on enregistre la photo immédiatement
      await this.photos.confirmAndSave(res.tempBase64);
      await this.router.navigate(['/tabs/gallery']).catch(() => {});
      await this.checkPermissionsState();
    } catch (e) {
      console.error('[CameraPage] onTake erreur inattendue:', e);
    } finally {
      // ✅ Important : on libère toujours le bouton
      this.isBusy = false;
    }
  }

  /** Validation (si jamais tu veux une étape de confirmation manuelle) */
  async onConfirm() {
    if (!this.tempBase64 || this.isSaving) return;
    this.isSaving = true;
    try {
      await this.photos.confirmAndSave(this.tempBase64);
      this.onCancel();
      this.router.navigate(['/tabs/gallery']).catch(() => {});
    } catch (e) {
      console.error('[CameraPage] onConfirm error:', e);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      this.isSaving = false;
    }
  }

  /** Annule un aperçu local (pas la prise de vue) */
  onCancel() {
    this.previewOpen = false;
    this.previewUrl = null;
    this.tempBase64 = null;
  }

  /** Optionnel — conversion pour le file picker (non utilisé ici) */
  private openFilePicker(): Promise<string | null> {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        try {
          const base64 = await this.fileToBase64(file);
          resolve(base64);
        } catch (e) {
          console.error('[CameraPage] fileToBase64 error', e);
          resolve(null);
        }
      };
      input.click();
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onload = () => {
        const result = reader.result as string;
        const idx = result.indexOf('base64,');
        resolve(idx >= 0 ? result.substring(idx + 7) : result);
      };
      reader.readAsDataURL(file);
    });
  }
}
