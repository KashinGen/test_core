import { ICommand } from '@nestjs/cqrs';

export class ApproveUserCommand implements ICommand {
  constructor(public readonly id: string) {}
}





