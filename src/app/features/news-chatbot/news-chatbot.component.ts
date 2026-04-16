import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatMessage } from '../../models/news.model';
import { ChatBotService } from '../../services/chat-bot.service';

@Component({
  selector: 'app-news-chatbot',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './news-chatbot.component.html',
  styleUrl: './news-chatbot.component.css',
})
export class NewsChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgList') private msgList!: ElementRef<HTMLElement>;

  protected isOpen = false;
  protected inputText = '';
  protected messages: ChatMessage[] = [];
  protected isTyping = false;
  private shouldScroll = false;

  constructor(private readonly bot: ChatBotService) {}

  ngOnInit(): void {
    this.messages = this.bot.getMessages();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  protected toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.shouldScroll = true;
    }
  }

  protected send(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.inputText = '';
    this.isTyping = true;
    this.shouldScroll = true;

    this.bot.sendMessage(text);

    // The bot service delays 120ms before pushing the reply; mirror that here
    setTimeout(() => {
      this.isTyping = false;
      this.shouldScroll = true;
    }, 260);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected clear(): void {
    this.bot.clearHistory();
    this.messages = this.bot.getMessages();
    this.shouldScroll = true;
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /** Convert **bold** and *italic* markdown to safe inline HTML */
  protected sanitiseMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom(): void {
    try {
      const el = this.msgList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      // noop
    }
  }
}
