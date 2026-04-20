import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'app/:appId',
    renderMode: RenderMode.Server,
  },
  {
    path: 'builder',
    renderMode: RenderMode.Server,
  },
  {
    path: 'article/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
