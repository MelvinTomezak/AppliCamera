import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage {}
