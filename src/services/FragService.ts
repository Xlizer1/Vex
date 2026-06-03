import { UserRepository } from "../repositories/UserRepository";
import { CooldownError, InsufficientFragsError } from "../errors";
import {
  DAILY_FRAGS,
  FRAGS_PER_MESSAGE,
  FRAGS_PER_VOICE_MINUTE,
  MESSAGE_FRAG_COOLDOWN_MS,
} from "../constants";

export interface DailyResult {
  newBalance: number;
}

export interface TransferResult {
  fromBalance: number;
  toBalance: number;
}

export interface FlipResult {
  won: boolean;
  winnerId: string;
  loserId: string;
  winnerBalance: number;
  amount: number;
}

export const FragService = {
  async awardMessageFrags(userId: string): Promise<void> {
    await UserRepository.awardFragsIfCooldownPassed(userId, FRAGS_PER_MESSAGE, MESSAGE_FRAG_COOLDOWN_MS);
  },

  async awardVoiceFrags(userIds: string[]): Promise<void> {
    await UserRepository.batchAddFrags(userIds, FRAGS_PER_VOICE_MINUTE);
  },

  async getBalance(userId: string): Promise<number> {
    return UserRepository.getBalance(userId);
  },

  async claimDaily(userId: string): Promise<DailyResult> {
    const result = await UserRepository.claimDaily(userId, DAILY_FRAGS);
    if (result.alreadyClaimed) throw new CooldownError(result.remainingMs);
    return { newBalance: result.newBalance };
  },

  async transfer(fromId: string, toId: string, amount: number): Promise<TransferResult> {
    const balance = await UserRepository.getBalance(fromId);
    if (balance < amount) throw new InsufficientFragsError(balance, amount);

    try {
      return await UserRepository.transferFrags(fromId, toId, amount);
    } catch {
      // Re-read balance in case it changed between check and transfer
      const fresh = await UserRepository.getBalance(fromId);
      throw new InsufficientFragsError(fresh, amount);
    }
  },

  async soloFlip(userId: string, amount: number): Promise<{ won: boolean; newBalance: number; amount: number }> {
    const balance = await UserRepository.getBalance(userId);
    if (balance < amount) throw new InsufficientFragsError(balance, amount);

    const won = Math.random() < 0.5;
    const delta = won ? amount : -amount;
    const newBalance = await UserRepository.addFrags(userId, delta);

    return { won, newBalance, amount };
  },

  async resolveFlipChallenge(challengerId: string, targetId: string, amount: number): Promise<FlipResult> {
    const [challengerBalance, targetBalance] = await Promise.all([
      UserRepository.getBalance(challengerId),
      UserRepository.getBalance(targetId),
    ]);

    if (challengerBalance < amount) throw new InsufficientFragsError(challengerBalance, amount);
    if (targetBalance < amount) throw new InsufficientFragsError(targetBalance, amount);

    const challengerWins = Math.random() < 0.5;
    const winnerId = challengerWins ? challengerId : targetId;
    const loserId  = challengerWins ? targetId : challengerId;

    const { winnerBalance } = await UserRepository.flipFrags(winnerId, loserId, amount);

    return { won: challengerWins, winnerId, loserId, winnerBalance, amount };
  },
};
