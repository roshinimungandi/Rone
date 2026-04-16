import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-news-query',
  standalone: true,
  templateUrl: './news-query.component.html',
  styleUrl: './news-query.component.css'
})
export class NewsQueryComponent {
  @Output() queryChange = new EventEmitter<string>();

  protected query = '';

  protected onQueryInput(query: string): void {
    this.query = query;
    this.queryChange.emit(this.query);
  }

  protected applyTopic(topic: string): void {
    this.query = topic;
    this.queryChange.emit(topic);
  }

  protected clearQuery(): void {
    this.query = '';
    this.queryChange.emit('');
  }
}
