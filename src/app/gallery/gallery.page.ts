import { Component } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PhotoSerice, SavedPhoto } from '../service/photo.service';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.scss'],
})
export class GalleryPage {
  selected?: SavedPhoto;

  constructor(public photoService: PhotoSerice, private modalCtrl: ModalController) {}

  open(photo: SavedPhoto) {
    this.selected = photo;
  }

  closeModal() {
    this.selected = undefined;
  }

  removeSelected() {
    if (!this.selected) return;
    const index = this.photoService.photos.indexOf(this.selected);
    if (index > -1) this.photoService.photos.splice(index, 1);
    this.selected = undefined;
  }
}
