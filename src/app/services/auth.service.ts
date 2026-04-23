import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RoneUser } from '../models/rone.model';

const LS_SESSION = 'rone_session';   // persisted current user
const LS_USERS   = 'rone_reg_users'; // persisted registered accounts

// ── Mock users (POC – Section 9.2 of solution-architecture.md) ───────────────
// In production these would come from Reuters SSO / OAuth 2.0 PKCE flow.
const SEED_USERS: RoneUser[] = [
  {
    id: 'usr-001',
    name: 'Alex Chen',
    email: 'alex.chen@reuters.com',
    subscription: 'professional',
    avatarInitials: 'AC',
  },
  {
    id: 'usr-002',
    name: 'Sarah Williams',
    email: 'sarah.williams@reuters.com',
    subscription: 'professional',
    avatarInitials: 'SW',
  },
  {
    id: 'usr-003',
    name: 'James Okonkwo',
    email: 'james.okonkwo@reuters.com',
    subscription: 'free',
    avatarInitials: 'JO',
  },
  {
    id: 'usr-004',
    name: 'Priya Sharma',
    email: 'priya.sharma@reuters.com',
    subscription: 'professional',
    avatarInitials: 'PS',
  },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private get isBrowser() { return isPlatformBrowser(this.platformId); }

  // Merge seed users + any users registered in a previous session
  private readonly _users: RoneUser[] = [
    ...SEED_USERS,
    ...this.loadRegisteredUsers(),
  ];

  private readonly _currentUser = signal<RoneUser | null>(this.loadSession());

  /** Reactive read-only view of the signed-in user (null if anonymous). */
  readonly currentUser = this._currentUser.asReadonly();

  /** All mock Reuters subscriber accounts available during POC. */
  get mockUsers(): RoneUser[] { return this._users; }

  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }

  /** Simulate SSO login by selecting a mock user. */
  login(userId: string): void {
    const user = this._users.find(u => u.id === userId) ?? null;
    this._currentUser.set(user);
    this.saveSession(user);
  }

  /** Sign in by email. Returns true on success. */
  loginWithEmail(email: string): boolean {
    const user = this._users.find(
      u => u.email.trim().toLowerCase() === email.trim().toLowerCase()
    ) ?? null;
    if (user) {
      this._currentUser.set(user);
      this.saveSession(user);
      return true;
    }
    return false;
  }

  /** Check whether an email address is already registered. */
  isEmailRegistered(email: string): boolean {
    return this._users.some(
      u => u.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
  }

  /** Register a new user and sign them in immediately. */
  register(name: string, email: string, subscription: 'free' | 'professional'): void {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('');
    const newUser: RoneUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subscription,
      avatarInitials: initials || '?',
    };
    this._users.push(newUser);
    this.saveRegisteredUsers();
    this._currentUser.set(newUser);
    this.saveSession(newUser);
  }

  /** Sign out and clear persisted session. */
  logout(): void {
    this._currentUser.set(null);
    this.saveSession(null);
  }

  // ── localStorage helpers (all browser-gated) ──────────────────────────────

  private loadSession(): RoneUser | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (!raw) return null;
      const saved = JSON.parse(raw) as RoneUser;
      // Refresh from live array so any seed changes are reflected
      return this._users.find(u => u.id === saved.id) ?? saved;
    } catch { return null; }
  }

  private saveSession(user: RoneUser | null): void {
    if (!this.isBrowser) return;
    if (user) {
      localStorage.setItem(LS_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(LS_SESSION);
    }
  }

  private loadRegisteredUsers(): RoneUser[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(LS_USERS);
      if (!raw) return [];
      const users = JSON.parse(raw) as RoneUser[];
      const seedIds = new Set(SEED_USERS.map(u => u.id));
      return users.filter(u => !seedIds.has(u.id));
    } catch { return []; }
  }

  private saveRegisteredUsers(): void {
    if (!this.isBrowser) return;
    const seedIds = new Set(SEED_USERS.map(u => u.id));
    const registered = this._users.filter(u => !seedIds.has(u.id));
    localStorage.setItem(LS_USERS, JSON.stringify(registered));
  }

  /** Update the current user's display name and email. */
  updateProfile(name: string, email: string): void {
    const user = this._currentUser();
    if (!user) return;
    const trimmedEmail = email.trim().toLowerCase();
    // Ensure email isn't already taken by a different account
    const duplicate = this._users.find(
      u => u.id !== user.id && u.email.trim().toLowerCase() === trimmedEmail
    );
    if (duplicate) return; // silently skip if duplicate — caller should validate
    const initials = name.trim().split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');
    const updated: RoneUser = { ...user, name: name.trim(), email: trimmedEmail, avatarInitials: initials || user.avatarInitials };
    const idx = this._users.findIndex(u => u.id === user.id);
    if (idx !== -1) this._users[idx] = updated;
    this._currentUser.set(updated);
    this.saveSession(updated);
  }

  /** Returns true if the email belongs to a different account. */
  isEmailTakenByOther(email: string, currentUserId: string): boolean {
    return this._users.some(
      u => u.id !== currentUserId && u.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
  }
}
