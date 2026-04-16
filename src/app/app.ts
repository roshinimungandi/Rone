import { Component } from '@angular/core';

import { ChatPanelComponent } from './features/chat-panel/chat-panel.component';
import { NewsChatbotComponent } from './features/news-chatbot/news-chatbot.component';
import { NewsDashboardComponent } from './features/news-dashboard/news-dashboard.component';
import { NewsFeedComponent } from './features/news-feed/news-feed.component';
import { NewsQueryComponent } from './features/news-query/news-query.component';
import { HomeContent, NewsSection } from './models/news.model';
import { NewsContentService } from './services/news-content.service';

@Component({
  selector: 'app-root',
  imports: [NewsDashboardComponent, NewsQueryComponent, NewsFeedComponent, ChatPanelComponent, NewsChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly content: HomeContent;
  protected visibleSections: NewsSection[];

  constructor(private readonly contentService: NewsContentService) {
    this.content = this.contentService.getHomeContent();
    this.visibleSections = this.content.sections;
  }

  protected onQueryChange(query: string): void {
    this.visibleSections = this.contentService.filterSectionsByQuery(query);
  }
}
