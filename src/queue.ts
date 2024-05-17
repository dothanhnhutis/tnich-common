import amqplib, { Channel, Connection, Message } from "amqplib";
export type ExchangeType = "direct" | "topic" | "fanout";
export type { Channel, Message, Connection } from "amqplib";

export abstract class Publish {
  abstract exchangeName: string;
  abstract exchangeType: ExchangeType;
  abstract routingKeyPub: string | string[];

  protected channel: Channel;
  constructor(channel: Channel) {
    this.channel = channel;
  }
  async publish(data: string) {
    await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
      durable: true,
    });
    const options = {
      persistent: true,
    };

    if (Array.isArray(this.routingKeyPub)) {
      for (const key of this.routingKeyPub) {
        this.channel.publish(
          this.exchangeName,
          key,
          Buffer.from(data),
          options
        );
      }
    } else {
      this.channel.publish(
        this.exchangeName,
        this.routingKeyPub,
        Buffer.from(data),
        options
      );
    }
  }
}

export abstract class Subscribe {
  abstract exchangeName: string;
  abstract exchangeType: ExchangeType;
  abstract routingKeySub: string | string[];
  abstract onMessage(msg: Message): Promise<void>;

  queueName: string;

  protected channel: Channel;
  constructor(channel: Channel, queueName: string = "") {
    this.channel = channel;
    this.queueName = queueName;
  }
  async subscribe() {
    await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
      durable: true,
    });
    const { queue } = await this.channel.assertQueue(this.queueName, {
      durable: true,
      autoDelete: false,
    });

    if (Array.isArray(this.routingKeySub)) {
      await Promise.all(
        this.routingKeySub.map((key) =>
          this.channel.bindQueue(queue, this.exchangeName, key)
        )
      );
    } else {
      await this.channel.bindQueue(
        queue,
        this.exchangeName,
        this.routingKeySub
      );
    }

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      await this.onMessage(msg);
    });
  }
}

export abstract class SendQuere {
  protected channel: Channel;
  abstract queueName: string;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async sendToQueue(data: string) {
    const options = {
      persistent: true,
    };
    await this.channel.assertQueue(this.queueName, { durable: true });
    this.channel.sendToQueue(this.queueName, Buffer.from(data), options);
  }
}

export abstract class ReceiveQuere {
  protected channel: Channel;
  abstract queueName: string;
  abstract onMessage(msg: Message): Promise<void>;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async listenToQueue() {
    await this.channel.assertQueue(this.queueName, { durable: true });
    await this.channel.consume(this.queueName, async (msg) => {
      if (!msg) return;
      await this.onMessage(msg);
    });
  }
}

export const createChannelRabbitMQ = async (url: string): Promise<Channel> => {
  try {
    const connection: Connection = await amqplib.connect(url);
    const channel: Channel = await connection.createChannel();
    closeConnection(channel, connection);
    return channel;
  } catch (error) {
    throw error;
  }
};

const closeConnection = (channel: Channel, connection: Connection): void => {
  process.once("SIGINT", async () => {
    await channel.close();
    await connection.close();
  });
};
