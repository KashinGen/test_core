import { IEvent } from '@nestjs/cqrs';

export abstract class AggregateRoot {
  private _uncommittedEvents: IEvent[] = [];

  protected apply(event: IEvent): void {
    this._uncommittedEvents.push(event);
    this.handle(event);
  }

  protected abstract handle(event: IEvent): void;

  getUncommittedEvents(): IEvent[] {
    return this._uncommittedEvents;
  }

  markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  loadFromHistory(events: IEvent[]): void {
    events.forEach((event) => this.handle(event));
  }

  get id(): string {
    return (this as any)._id;
  }
}


