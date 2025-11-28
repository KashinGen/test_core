import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '@domain/events/user-created.event';
import { UserUpdatedEvent } from '@domain/events/user-updated.event';
import { UserDeletedEvent } from '@domain/events/user-deleted.event';
import { UserApprovedEvent } from '@domain/events/user-approved.event';
import { UserBlockedEvent } from '@domain/events/user-blocked.event';
import { RoleGrantedEvent } from '@domain/events/role-granted.event';
import { PasswordChangedEvent } from '@domain/events/password-changed.event';
import { UserReadModelRepository } from './user-read-model.repository';

@EventsHandler(
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserApprovedEvent,
  UserBlockedEvent,
  RoleGrantedEvent,
  PasswordChangedEvent,
)
export class UserProjection implements IEventHandler<any> {
  constructor(private readonly readModel: UserReadModelRepository) {}

  async handle(
    event:
      | UserCreatedEvent
      | UserUpdatedEvent
      | UserDeletedEvent
      | UserApprovedEvent
      | UserBlockedEvent
      | RoleGrantedEvent
      | PasswordChangedEvent,
  ): Promise<void> {
    if (event instanceof UserCreatedEvent) {
      await this.readModel.projectUserCreated(event);
    } else if (event instanceof UserUpdatedEvent) {
      await this.readModel.projectUserUpdated(event);
    } else if (event instanceof UserDeletedEvent) {
      await this.readModel.projectUserDeleted(event);
    } else if (event instanceof PasswordChangedEvent) {
      await this.readModel.projectPasswordChanged(event);
    } else if (event instanceof UserApprovedEvent) {
      await this.readModel.projectUserApproved(event);
    } else if (event instanceof UserBlockedEvent) {
      await this.readModel.projectUserBlocked(event);
    } else if (event instanceof RoleGrantedEvent) {
      await this.readModel.projectRoleGranted(event);
    }
  }
}


