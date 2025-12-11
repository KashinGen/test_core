import { ICommand } from '@nestjs/cqrs';

export class ResetAccountPasswordCommand implements ICommand {
  constructor(public readonly email: string) {}
}




