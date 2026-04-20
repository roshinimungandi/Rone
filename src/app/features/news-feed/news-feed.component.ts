import { Component, Input } from '@angular/core';
import { NewsSection } from '../../models/news.model';

@Component({
  selector: 'app-news-feed',
  standalone: true,
  imports: [],
  templateUrl: './news-feed.component.html',
  styleUrl: './news-feed.component.css'
})
export class NewsFeedComponent {
  @Input({ required: true }) sections: NewsSection[] = [];
}
