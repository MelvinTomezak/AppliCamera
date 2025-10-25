import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  PermissionStatus
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface SavedPhoto {
  webviewPath: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoSerice {
  public photos: SavedPhoto[] = [];

  constructor() {}

  async ensurePermissions() {
    const permissions: PermissionStatus = await Camera.checkPermissions();
    if (permissions.camera !== 'granted') {
      await Camera.requestPermissions({ permissions: ['camera'] });
    }
  }

  async takePhoto() {
    console.log('take photo');
    await this.ensurePermissions();

    try {
      const source = Capacitor.getPlatform() === 'web'
        ? CameraSource.Prompt    // ✅ navigateur → affiche menu webcam ou fichier
        : CameraSource.Camera;   // ✅ mobile → ouvre la caméra native

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source
      });

      if (image.webPath) {
        this.photos.unshift({ webviewPath: image.webPath });
      }
    } catch (err) {
      console.log('Photo annulée ou erreur :', err);
    }
  }
}
