import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './guards/auth.guard';
import { WelcomeComponent }       from './features/welcome/welcome.component';
import { BuilderComponent }       from './features/builder/builder.component';
import { GeneratedAppComponent }  from './features/generated-app/generated-app.component';
import { ArticleDetailComponent } from './features/article-detail/article-detail.component';
import { CollectionsComponent }   from './features/collections/collections.component';

export const routes: Routes = [
  {
    path: '',
    component: WelcomeComponent,
    canActivate: [noAuthGuard],
  },
  {
    path: 'builder',
    component: BuilderComponent,
    canActivate: [authGuard],
  },
  {
    // Intentionally no auth guard: generated apps are shareable by URL.
    // In production, per-app visibility settings would be enforced server-side.
    path: 'app/:appId',
    component: GeneratedAppComponent,
  },
  {
    path: 'article/:id',
    component: ArticleDetailComponent,
  },
  {
    path: 'collections',
    component: CollectionsComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
