import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location, TitleCasePipe } from '@angular/common';
import { NewsContentService } from '../../services/news-content.service';
import { NewsStory } from '../../models/news.model';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [RouterLink, TitleCasePipe],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.css',
})
export class ArticleDetailComponent implements OnInit {
  story: NewsStory | null = null;
  notFound = false;
  relatedStories: NewsStory[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly location: Location,
    private readonly contentService: NewsContentService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const found = this.contentService.getStoryById(id);

    if (!found || !found.body) {
      this.notFound = true;
      return;
    }

    this.story = found;

    // Load related articles
    this.relatedStories = (found.relatedIds ?? [])
      .map((rid) => this.contentService.getStoryById(rid))
      .filter((s): s is NewsStory => s !== undefined && !!s.body)
      .slice(0, 3);
  }

  goBack(): void {
    this.location.back();
  }

  formatReadingProgress(body: string[]): string {
    const words = body.join(' ').split(' ').length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} min read`;
  }
}
