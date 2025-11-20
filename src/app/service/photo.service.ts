import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource
} from '@capacitor/camera';
import {
  Filesystem,
  Directory,
  WriteFileResult
} from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Geolocation } from '@capacitor/geolocation';

export interface Photo {
  id: string;
  filePath: string;
  webPath?: string;
  createdAt: string;
  liked?: boolean;
  coords?: { lat: number; lng: number };
  address?: string;
}

const PHOTOS_KEY = 'photos_v1';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private photos: Photo[] = [];

  /**
   * Ouvre la caméra (ou le prompt web).
   * Retourne {previewDataUrl,tempBase64} ou NULL si l'utilisateur annule.
   */
  async takeAndPreview(usePromptOnWeb = false): Promise<{ previewDataUrl: string; tempBase64: string } | null> {
    try {
      const shot = await Camera.getPhoto({
        source: usePromptOnWeb ? CameraSource.Prompt : CameraSource.Camera,
        resultType: CameraResultType.Base64,
        quality: 90,
        allowEditing: false,
        correctOrientation: true,
        saveToGallery: false
      });

      if (!shot?.base64String) return null;

      return {
        previewDataUrl: `data:image/jpeg;base64,${shot.base64String}`,
        tempBase64: shot.base64String
      };
    } catch (e: any) {
      // Annulation utilisateur (croix / retour / fermeture)
      if (this.isUserCancel(e)) return null;
      throw e;
    }
  }

  /** Détection des erreurs "annulation utilisateur" cross-platform */
  private isUserCancel(err: any): boolean {
    const code = (err && (err.code || err.error)) ?? '';
    const msg = String(err?.message ?? err ?? '').toLowerCase();
    return (
      code === 'USER_CANCEL' ||
      code === 'OperationCanceled' ||
      msg.includes('cancel') ||
      msg.includes('user cancelled') ||
      msg.includes('no image') ||
      msg.includes('did not finish')
    );
  }

  /**
   * Sauvegarde la photo (fichier + webPath), tente géoloc, persiste.
   */
  async confirmAndSave(tempBase64: string): Promise<Photo> {
    const fileName = `photo_${Date.now()}.jpeg`;

    const writeRes: WriteFileResult = await Filesystem.writeFile({
      path: fileName,
      data: tempBase64,
      directory: Directory.Data
    });

    const p: Photo = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      filePath: writeRes.uri ?? fileName,
      createdAt: new Date().toISOString(),
      liked: false
    };

    // géoloc best-effort
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      if (pos?.coords) p.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { /* ignore */ }

    const file = await Filesystem.readFile({ path: p.filePath });
    p.webPath = `data:image/jpeg;base64,${file.data}`;

    this.photos.unshift(p);
    await this.persist();
    return p;
  }

  /** Chargement + reconstruction des DataURL si besoin */
  async load(): Promise<Photo[]> {
    const { value } = await Preferences.get({ key: PHOTOS_KEY });
    this.photos = value ? JSON.parse(value) : [];

    for (const p of this.photos) {
      if (!p.webPath && p.filePath) {
        try {
          const f = await Filesystem.readFile({ path: p.filePath });
          p.webPath = `data:image/jpeg;base64,${f.data}`;
        } catch { /* fichier manquant */ }
      }
    }
    return this.photos;
  }

  getAll(): Photo[] { return this.photos; }
  getById(id: string): Photo | undefined { return this.photos.find(p => p.id === id); }

  async toggleLike(id: string): Promise<void> {
    const t = this.getById(id); if (!t) return;
    t.liked = !t.liked;
    await this.persist();
  }

  async remove(id: string): Promise<void> {
    const i = this.photos.findIndex(p => p.id === id);
    if (i >= 0) {
      const t = this.photos[i];
      try { if (t.filePath) await Filesystem.deleteFile({ path: t.filePath }); } catch {}
      this.photos.splice(i, 1);
      await this.persist();
    }
  }

  async patch(id: string, patch: Partial<Photo>): Promise<void> {
    const p = this.getById(id); if (!p) return;
    Object.assign(p, patch);
    await this.persist();
  }

  private async persist() {
    await Preferences.set({ key: PHOTOS_KEY, value: JSON.stringify(this.photos) });
  }
}
