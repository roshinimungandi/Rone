import { TitleCasePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [TitleCasePipe, FormsModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent {
  // Modal visibility & mode
  protected readonly showAuthModal  = signal(false);
  protected readonly authMode       = signal<'signin' | 'signup'>('signin');
  protected readonly authError      = signal('');

  // Sign-in fields
  protected siEmail    = '';
  protected siPassword = '';

  // Sign-up fields
  protected suName     = '';
  protected suEmail    = '';
  protected suPassword = '';
  protected suConfirm  = '';
  protected suPlan: 'free' | 'professional' = 'professional';

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  // ── Open / close ──────────────────────────────────────────────────────────

  protected openSignIn(): void {
    this.authMode.set('signin');
    this.authError.set('');
    this.siEmail = '';
    this.siPassword = '';
    this.showAuthModal.set(true);
  }

  protected closeAuth(): void {
    this.showAuthModal.set(false);
    this.authError.set('');
  }

  protected switchMode(mode: 'signin' | 'signup'): void {
    this.authMode.set(mode);
    this.authError.set('');
  }

  // ── Sign in ───────────────────────────────────────────────────────────────

  protected submitSignIn(): void {
    if (!this.siEmail.trim() || !this.siPassword.trim()) {
      this.authError.set('Please enter your email and password.');
      return;
    }
    const ok = this.auth.loginWithEmail(this.siEmail);
    if (!ok) {
      this.authError.set('No account found with that email. New here? Sign up instead.');
      return;
    }
    this.closeAuth();
    this.router.navigate(['/builder']);
  }

  // ── Sign up ───────────────────────────────────────────────────────────────

  protected submitSignUp(): void {
    if (!this.suName.trim() || !this.suEmail.trim() || !this.suPassword.trim()) {
      this.authError.set('Please fill in all required fields.');
      return;
    }
    if (this.suPassword !== this.suConfirm) {
      this.authError.set('Passwords do not match.');
      return;
    }
    if (this.auth.isEmailRegistered(this.suEmail)) {
      this.authError.set('An account with this email already exists. Please sign in.');
      return;
    }
    this.auth.register(this.suName, this.suEmail, this.suPlan);
    this.closeAuth();
    this.router.navigate(['/builder']);
  }
}
