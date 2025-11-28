import { AggregateRoot } from '../common/aggregate-root';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserUpdatedEvent } from '../events/user-updated.event';
import { UserDeletedEvent } from '../events/user-deleted.event';
import { UserApprovedEvent } from '../events/user-approved.event';
import { UserBlockedEvent } from '../events/user-blocked.event';
import { RoleGrantedEvent } from '../events/role-granted.event';
import { PasswordChangedEvent } from '../events/password-changed.event';
import { IEvent } from '@nestjs/cqrs';

export class User extends AggregateRoot {
  private _id: string;
  private _name: string;
  private _email: string;
  private _passwordHash: string;
  private _roles: string[] = [];
  private _sources: string[] = [];
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt?: Date;
  private _approved = false;
  private _blockedAt?: Date;

  static create(
    id: string,
    name: string,
    email: string,
    hash: string,
    roles: string[],
    sources: string[] = [],
  ): User {
    const user = new User();
    user.apply(new UserCreatedEvent(id, name, email, hash, roles, sources));
    return user;
  }

  update(name?: string, email?: string, roles?: string[], sources?: string[]): void {
    if (this._deletedAt) {
      throw new Error('Cannot update deleted user');
    }
    this.apply(new UserUpdatedEvent(this._id, name, email, roles, sources));
  }

  delete(): void {
    if (this._deletedAt) {
      return; // Already deleted
    }
    this.apply(new UserDeletedEvent(this._id));
  }

  changePassword(hash: string): void {
    if (this._deletedAt) {
      throw new Error('Cannot change password for deleted user');
    }
    this.apply(new PasswordChangedEvent(this._id, hash));
  }

  approve(): void {
    if (!this._approved) {
      this.apply(new UserApprovedEvent(this._id));
    }
  }

  block(): void {
    if (!this._blockedAt) {
      this.apply(new UserBlockedEvent(this._id));
    }
  }

  grantRoles(roles: string[]): void {
    this.apply(new RoleGrantedEvent(this._id, roles));
  }

  protected handle(event: IEvent): void {
    if (event instanceof UserCreatedEvent) {
      this.onUserCreated(event);
    } else if (event instanceof UserUpdatedEvent) {
      this.onUserUpdated(event);
    } else if (event instanceof UserDeletedEvent) {
      this.onUserDeleted(event);
    } else if (event instanceof PasswordChangedEvent) {
      this.onPasswordChanged(event);
    } else if (event instanceof UserApprovedEvent) {
      this.onUserApproved(event);
    } else if (event instanceof UserBlockedEvent) {
      this.onUserBlocked(event);
    } else if (event instanceof RoleGrantedEvent) {
      this.onRoleGranted(event);
    }
  }

  private onUserCreated(event: UserCreatedEvent): void {
    this._id = event.id;
    this._name = event.name;
    this._email = event.email;
    this._passwordHash = event.hash;
    this._roles = event.roles;
    this._sources = event.sources;
    this._createdAt = event.createdAt;
    this._updatedAt = event.createdAt;
  }

  private onUserUpdated(event: UserUpdatedEvent): void {
    if (event.name !== undefined) {
      this._name = event.name;
    }
    if (event.email !== undefined) {
      this._email = event.email;
    }
    if (event.roles !== undefined) {
      this._roles = event.roles;
    }
    if (event.sources !== undefined) {
      this._sources = event.sources;
    }
    this._updatedAt = event.updatedAt;
  }

  private onUserDeleted(event: UserDeletedEvent): void {
    this._deletedAt = event.deletedAt;
    this._updatedAt = event.deletedAt;
  }

  private onPasswordChanged(event: PasswordChangedEvent): void {
    this._passwordHash = event.hash;
    this._updatedAt = event.changedAt;
  }

  private onUserApproved(event: UserApprovedEvent): void {
    this._approved = true;
    this._updatedAt = event.approvedAt;
  }

  private onUserBlocked(event: UserBlockedEvent): void {
    this._blockedAt = event.blockedAt;
    this._updatedAt = event.blockedAt;
  }

  private onRoleGranted(event: RoleGrantedEvent): void {
    this._roles = event.roles;
    this._updatedAt = event.grantedAt;
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get roles(): string[] {
    return [...this._roles];
  }

  get sources(): string[] {
    return [...this._sources];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  get approved(): boolean {
    return this._approved;
  }

  get blockedAt(): Date | undefined {
    return this._blockedAt;
  }

  get isBlocked(): boolean {
    return !!this._blockedAt;
  }

  get isDeleted(): boolean {
    return !!this._deletedAt;
  }
}
