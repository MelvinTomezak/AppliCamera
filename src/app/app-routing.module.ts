import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'camera',
        loadComponent: () => import('./home/home.page').then(m => m.HomePage)
      },
      {
        path: 'gallery',
        loadComponent: () => import('./gallery/gallery.page').then(m => m.GalleryPage)
      },
      {
        path: 'map',
        loadComponent: () => import('./map/map.page').then(m => m.MapPage)
      },
      { path: '', redirectTo: 'camera', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'tabs/camera', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/camera' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
