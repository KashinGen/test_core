import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { IEvent } from '@nestjs/cqrs';

@Injectable()
export class KafkaPublisher implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;
  private connected = false;

  constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
    const kafka = new Kafka({
      clientId: 'core-service',
      brokers,
    });

    this.producer = kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.connected = true;
    } catch (error) {
      console.warn('Failed to connect to Kafka, events will not be published:', error);
      this.connected = false;
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.producer.disconnect();
    }
  }

  async publish<T extends IEvent>(event: T): Promise<void> {
    if (!this.connected) {
      return;
    }

    const aggregateId = (event as any).id || 'unknown';

    try {
      await this.producer.send({
        topic: 'iam.events',
        messages: [
          {
            key: aggregateId,
            value: JSON.stringify({
              eventType: event.constructor.name,
              payload: event,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
    } catch (error) {
      console.error('Failed to publish event to Kafka:', error);
      throw error;
    }
  }
}

