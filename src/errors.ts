export class BotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InsufficientFragsError extends BotError {
  constructor(public readonly balance: number, public readonly required: number) {
    super(`Insufficient frags: have ${balance}, need ${required}`);
  }
}

export class CooldownError extends BotError {
  constructor(public readonly remainingMs: number) {
    super(`On cooldown for ${remainingMs}ms`);
  }
}

export class SteamResolutionError extends BotError {
  constructor() { super("Could not resolve Steam profile"); }
}

export class RoleNotFoundError extends BotError {
  constructor(name: string) { super(`Role not found: ${name}`); }
}

export class TargetNotFoundError extends BotError {
  constructor() { super("Target user not found"); }
}
