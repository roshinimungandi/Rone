import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.css'
})
export class ChatPanelComponent {
  @Input({ required: true }) liveUpdates: string[] = [];
  @Input({ required: true }) editorPicks: string[] = [];
}
