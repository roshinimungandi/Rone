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
    const email = this.siEmail.trim();
    const pwd   = this.siPassword.trim();

    if (!email) {
      this.authError.set('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.authError.set('Please enter a valid email address.');
      return;
    }
    if (!pwd) {
      this.authError.set('Please enter your password.');
      return;
    }
    if (pwd.length < 6) {
      this.authError.set('Password must be at least 6 characters.');
      return;
    }
    const ok = this.auth.loginWithEmail(email);
    if (!ok) {
      this.authError.set('No account found with that email. New here? Sign up instead.');
      return;
    }
    this.closeAuth();
    this.router.navigate(['/builder']);
  }

  // ── Sign up ───────────────────────────────────────────────────────────────

  protected submitSignUp(): void {
    const name    = this.suName.trim();
    const email   = this.suEmail.trim();
    const pwd     = this.suPassword.trim();
    const confirm = this.suConfirm.trim();

    if (!name) {
      this.authError.set('Please enter your full name.');
      return;
    }
    if (name.length < 2) {
      this.authError.set('Name must be at least 2 characters.');
      return;
    }
    if (!email) {
      this.authError.set('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.authError.set('Please enter a valid email address.');
      return;
    }
    if (!pwd) {
      this.authError.set('Please enter a password.');
      return;
    }
    if (pwd.length < 6) {
      this.authError.set('Password must be at least 6 characters.');
      return;
    }
    if (!confirm) {
      this.authError.set('Please confirm your password.');
      return;
    }
    if (pwd !== confirm) {
      this.authError.set('Passwords do not match.');
      return;
    }
    if (this.auth.isEmailRegistered(email)) {
      this.authError.set('An account with this email already exists. Please sign in.');
      return;
    }
    this.auth.register(name, email, this.suPassword, this.suPlan);
    this.closeAuth();
    this.router.navigate(['/builder']);
  }
}
