// controllers/WalletController.ts
import { get, push, ref, set, update } from 'firebase/database';
import { CREDITS_PER_USE, FREE_USAGE_LIMITS } from '../../constants/credits';
import { Module } from '../_models/Module';
import { ModuleUsage, PaymentMethod, Wallet, WalletTransaction } from '../_models/Wallet';
import { auth, db } from '../config/firebaseConfig';

export class WalletController {
  // ---------- Auth helper ----------

  private static getCurrentUid(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // ---------- Wallet CRUD ----------

  /** Get or create wallet for the current user */
  static async getWallet(): Promise<Wallet> {
    const uid = this.getCurrentUid();
    const snap = await get(ref(db, `wallets/${uid}`));
    if (snap.exists()) return snap.val() as Wallet;
    // First access — create empty wallet
    const wallet: Wallet = {
      uid,
      balance: 0,
      totalLoaded: 0,
      totalSpent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await set(ref(db, `wallets/${uid}`), wallet);
    return wallet;
  }

  /** Add credits to wallet (after successful payment) */
  static async addCredits(
    amount: number,
    paymentMethod: PaymentMethod,
    paymentId: string,
    phpAmount: number,
  ): Promise<Wallet> {
    const uid = this.getCurrentUid();
    const wallet = await this.getWallet();
    const newBalance = wallet.balance + amount;

    const updatedWallet: Partial<Wallet> = {
      balance: newBalance,
      totalLoaded: wallet.totalLoaded + amount,
      updatedAt: Date.now(),
    };
    await update(ref(db, `wallets/${uid}`), updatedWallet);

    // Record transaction
    await this.recordTransaction({
      uid,
      type: 'top_up',
      amount,
      balanceAfter: newBalance,
      description: `Top-up via ${paymentMethod.toUpperCase()}`,
      paymentMethod,
      paymentId,
      phpAmount,
    });

    return { ...wallet, ...updatedWallet } as Wallet;
  }

  /** Deduct credits for module use */
  static async deductCredits(module: Module): Promise<{ wallet: Wallet; transactionId: string }> {
    const uid = this.getCurrentUid();
    const wallet = await this.getWallet();
    const cost = CREDITS_PER_USE[module.difficultyLevel || 'basic'] ?? CREDITS_PER_USE.basic;

    if (wallet.balance < cost) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    const newBalance = wallet.balance - cost;
    const updatedWallet: Partial<Wallet> = {
      balance: newBalance,
      totalSpent: wallet.totalSpent + cost,
      updatedAt: Date.now(),
    };
    await update(ref(db, `wallets/${uid}`), updatedWallet);

    // Record transaction
    const transactionId = await this.recordTransaction({
      uid,
      type: 'module_use',
      amount: -cost,
      balanceAfter: newBalance,
      description: `Used module: ${module.moduleTitle}`,
      moduleId: module.moduleId,
      moduleTitle: module.moduleTitle,
      trainerId: module.trainerId,
      difficultyLevel: module.difficultyLevel || 'basic',
    });

    return { wallet: { ...wallet, ...updatedWallet } as Wallet, transactionId };
  }

  // ---------- Transaction history ----------

  private static async recordTransaction(data: Omit<WalletTransaction, 'transactionId' | 'createdAt'>): Promise<string> {
    const transactionRef = push(ref(db, `walletTransactions/${data.uid}`));
    const transactionId = transactionRef.key!;
    const transaction: WalletTransaction = {
      ...data,
      transactionId,
      createdAt: Date.now(),
    };
    await set(transactionRef, transaction);
    return transactionId;
  }

  /** Get transaction history for current user, most recent first */
  static async getTransactions(limit?: number): Promise<WalletTransaction[]> {
    const uid = this.getCurrentUid();
    const snap = await get(ref(db, `walletTransactions/${uid}`));
    if (!snap.exists()) return [];
    const data = snap.val();
    const transactions: WalletTransaction[] = Object.values(data);
    transactions.sort((a, b) => b.createdAt - a.createdAt);
    if (limit) return transactions.slice(0, limit);
    return transactions;
  }

  // ---------- Module usage tracking (per trainer) ----------

  /** Get how many times current user has used a specific module */
  static async getModuleUsageCount(moduleId: string, trainerId: string): Promise<number> {
    const uid = this.getCurrentUid();
    const snap = await get(ref(db, `moduleUsage/${uid}/${trainerId}/${moduleId}`));
    if (!snap.exists()) return 0;
    return (snap.val() as ModuleUsage).useCount || 0;
  }

  /** Increment usage count for a module */
  static async incrementModuleUsage(module: Module): Promise<number> {
    const uid = this.getCurrentUid();
    const path = `moduleUsage/${uid}/${module.trainerId}/${module.moduleId}`;
    const snap = await get(ref(db, path));
    const current = snap.exists() ? (snap.val() as ModuleUsage) : null;
    const newCount = (current?.useCount || 0) + 1;

    const usage: ModuleUsage = {
      moduleId: module.moduleId,
      trainerId: module.trainerId,
      uid,
      useCount: newCount,
      lastUsedAt: Date.now(),
    };
    await set(ref(db, path), usage);
    return newCount;
  }

  // ---------- Access check ----------

  /**
   * Check whether the user can access a module.
   * Returns { allowed, reason, freeUsesLeft, creditCost, balance }
   */
  static async checkModuleAccess(module: Module): Promise<{
    allowed: boolean;
    isFree: boolean;
    freeUsesLeft: number;
    creditCost: number;
    balance: number;
    reason?: string;
  }> {
    const difficulty = module.difficultyLevel || 'basic';
    const freeLimit = FREE_USAGE_LIMITS[difficulty] ?? FREE_USAGE_LIMITS.basic;
    const creditCost = CREDITS_PER_USE[difficulty] ?? CREDITS_PER_USE.basic;

    const usageCount = await this.getModuleUsageCount(module.moduleId, module.trainerId);
    const freeUsesLeft = Math.max(0, freeLimit - usageCount);
    const wallet = await this.getWallet();

    if (freeUsesLeft > 0) {
      return { allowed: true, isFree: true, freeUsesLeft, creditCost, balance: wallet.balance };
    }

    if (wallet.balance >= creditCost) {
      return { allowed: true, isFree: false, freeUsesLeft: 0, creditCost, balance: wallet.balance };
    }

    return {
      allowed: false,
      isFree: false,
      freeUsesLeft: 0,
      creditCost,
      balance: wallet.balance,
      reason: 'INSUFFICIENT_CREDITS',
    };
  }

  /**
   * Consume one use of a module. Handles free uses AND credit deduction.
   * Should be called when the user starts a module session.
   */
  static async consumeModuleUse(module: Module): Promise<{
    usedFree: boolean;
    creditsDeducted: number;
    newBalance: number;
    freeUsesLeft: number;
    transactionId?: string;
  }> {
    const access = await this.checkModuleAccess(module);
    if (!access.allowed) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    // Always increment usage
    const newUsageCount = await this.incrementModuleUsage(module);

    const difficulty = module.difficultyLevel || 'basic';
    const freeLimit = FREE_USAGE_LIMITS[difficulty] ?? FREE_USAGE_LIMITS.basic;

    if (access.isFree) {
      // Free use — no deduction
      return {
        usedFree: true,
        creditsDeducted: 0,
        newBalance: access.balance,
        freeUsesLeft: Math.max(0, freeLimit - newUsageCount),
      };
    }

    // Paid use — deduct credits
    const { wallet, transactionId } = await this.deductCredits(module);
    return {
      usedFree: false,
      creditsDeducted: access.creditCost,
      newBalance: wallet.balance,
      freeUsesLeft: 0,
      transactionId,
    };
  }
}
