import { Component, Input } from '@angular/core';
import { MarketTicker, NewsStory } from '../../models/news.model';

@Component({
  selector: 'app-news-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './news-dashboard.component.html',
  styleUrl: './news-dashboard.component.css'
})
export class NewsDashboardComponent {
  @Input({ required: true }) leadStory!: NewsStory;
  @Input({ required: true }) spotlightStory!: NewsStory;
  @Input({ required: true }) topHeadlines: NewsStory[] = [];
  @Input({ required: true }) marketTicker: MarketTicker[] = [];
}
