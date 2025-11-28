import { User } from './user.entity';
import { Role } from '../common/types';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserApprovedEvent } from '../events/user-approved.event';
import { UserBlockedEvent } from '../events/user-blocked.event';
import { RoleGrantedEvent } from '../events/role-granted.event';

describe('User Entity', () => {
  it('should create user with UserCreatedEvent', () => {
    const user = User.create('123', 'test@example.com', 'hash', Role.USER);

    expect(user.id).toBe('123');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe(Role.USER);
    expect(user.approved).toBe(false);
    expect(user.getUncommittedEvents()).toHaveLength(1);
    expect(user.getUncommittedEvents()[0]).toBeInstanceOf(UserCreatedEvent);
  });

  it('should approve user', () => {
    const user = User.create('123', 'test@example.com', 'hash', Role.USER);
    user.markEventsAsCommitted();

    user.approve();

    expect(user.approved).toBe(true);
    expect(user.getUncommittedEvents()).toHaveLength(1);
    expect(user.getUncommittedEvents()[0]).toBeInstanceOf(UserApprovedEvent);
  });

  it('should block user', () => {
    const user = User.create('123', 'test@example.com', 'hash', Role.USER);
    user.markEventsAsCommitted();

    user.block();

    expect(user.isBlocked).toBe(true);
    expect(user.getUncommittedEvents()).toHaveLength(1);
    expect(user.getUncommittedEvents()[0]).toBeInstanceOf(UserBlockedEvent);
  });

  it('should grant role', () => {
    const user = User.create('123', 'test@example.com', 'hash', Role.USER);
    user.markEventsAsCommitted();

    user.grantRole(Role.ADMIN);

    expect(user.role).toBe(Role.ADMIN);
    expect(user.getUncommittedEvents()).toHaveLength(1);
    expect(user.getUncommittedEvents()[0]).toBeInstanceOf(RoleGrantedEvent);
  });

  it('should load from history', () => {
    const events = [
      new UserCreatedEvent('123', 'test@example.com', 'hash', Role.USER),
      new UserApprovedEvent('123'),
      new RoleGrantedEvent('123', Role.ADMIN),
    ];

    const user = new User();
    user.loadFromHistory(events);

    expect(user.id).toBe('123');
    expect(user.email).toBe('test@example.com');
    expect(user.approved).toBe(true);
    expect(user.role).toBe(Role.ADMIN);
  });
});


