import { TitleCasePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoneUser } from '../../models/rone.model';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent {
  protected readonly showSignInModal = signal(false);
  protected selectedUserId = '';

  readonly mockUsers: RoneUser[];

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.mockUsers = this.auth.mockUsers;
  }

  protected openSignIn(): void {
    this.selectedUserId = '';
    this.showSignInModal.set(true);
  }

  protected closeSignIn(): void {
    this.showSignInModal.set(false);
  }

  protected signIn(): void {
    if (!this.selectedUserId) return;
    this.auth.login(this.selectedUserId);
    this.showSignInModal.set(false);
    this.router.navigate(['/builder']);
  }
}
