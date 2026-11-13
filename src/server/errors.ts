export class AccessError extends Error {
  constructor(message = "You do not have access to that record.") {
    super(message);
    this.name = "AccessError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
