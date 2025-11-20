import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },

  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',    loadComponent: () => import('./home/home.page').then(m => m.HomePage) },
      { path: 'gallery', loadComponent: () => import('./gallery/gallery.page').then(m => m.GalleryPage) },
      { path: 'camera',  loadComponent: () => import('./camera/camera.page').then(m => m.CameraPage) },
      { path: 'map',     loadComponent: () => import('./map/map.page').then(m => m.MapPage) },
    ]
  },

  { path: '**', redirectTo: 'tabs' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
