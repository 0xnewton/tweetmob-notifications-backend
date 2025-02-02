export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export class SubscriptionExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionExistsError";
  }
}

export class SubscriptionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionNotFoundError";
  }
}
