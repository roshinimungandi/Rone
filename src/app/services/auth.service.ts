import { Injectable, signal } from '@angular/core';
import { RoneUser } from '../models/rone.model';

// ── Mock users (POC – Section 9.2 of solution-architecture.md) ───────────────
// In production these would come from Reuters SSO / OAuth 2.0 PKCE flow.
const MOCK_USERS: RoneUser[] = [
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
    subscription: 'basic',
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
  private readonly _currentUser = signal<RoneUser | null>(null);

  /** Reactive read-only view of the signed-in user (null if anonymous). */
  readonly currentUser = this._currentUser.asReadonly();

  /** All mock Reuters subscriber accounts available during POC. */
  readonly mockUsers = MOCK_USERS;

  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }

  /** Simulate SSO login by selecting a mock user (AUTH-020). */
  login(userId: string): void {
    const user = MOCK_USERS.find(u => u.id === userId) ?? null;
    this._currentUser.set(user);
  }

  /** Sign out the current user and clear session state (AUTH-024). */
  logout(): void {
    this._currentUser.set(null);
  }
}
