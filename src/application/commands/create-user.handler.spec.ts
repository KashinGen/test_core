import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateUserHandler } from './create-user.handler';
import { CreateUserCommand } from './create-user.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { User } from '@domain/entities/user.entity';
import { Role } from '@domain/common/types';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let repository: jest.Mocked<IUserRepository>;
  let publisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    const mockRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
    };

    const mockPublisher = {
      mergeObjectContext: jest.fn((obj) => obj),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        {
          provide: 'IUserRepository',
          useValue: mockRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockPublisher,
        },
      ],
    }).compile();

    handler = module.get<CreateUserHandler>(CreateUserHandler);
    repository = module.get('IUserRepository');
    publisher = module.get(EventPublisher);
  });

  it('should create user successfully', async () => {
    repository.findByEmail.mockResolvedValue(undefined);
    repository.save.mockResolvedValue(undefined);

    const command = new CreateUserCommand(
      'test@example.com',
      'password123',
      Role.USER,
    );

    const result = await handler.execute(command);

    expect(result).toHaveProperty('id');
    expect(repository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw ConflictException if user exists', async () => {
    const existingUser = User.create('123', 'test@example.com', 'hash', Role.USER);
    repository.findByEmail.mockResolvedValue(existingUser);

    const command = new CreateUserCommand(
      'test@example.com',
      'password123',
      Role.USER,
    );

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });
});


