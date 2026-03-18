// models/Wallet.ts

export interface Wallet {
  uid: string;
  balance: number; // Credits balance
  totalLoaded: number; // Total credits ever purchased
  totalSpent: number; // Total credits ever used
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface WalletTransaction {
  transactionId: string;
  uid: string;
  type: 'top_up' | 'module_use';
  amount: number; // Positive for top-up, negative for usage
  balanceAfter: number;
  description: string;
  // Payment details (for top_up)
  paymentMethod?: 'gcash' | 'maya' | 'card';
  paymentId?: string; // PayMongo payment ID
  phpAmount?: number; // Amount in PHP (for top-up)
  // Module details (for module_use)
  moduleId?: string;
  moduleTitle?: string;
  trainerId?: string;
  difficultyLevel?: 'basic' | 'intermediate' | 'advanced';
  createdAt: number; // Timestamp
}

export interface ModuleUsage {
  moduleId: string;
  trainerId: string;
  uid: string;
  useCount: number; // Times this user has used this module
  lastUsedAt: number; // Timestamp
}

export type PaymentMethod = 'gcash' | 'maya' | 'card';

export interface TopUpPackage {
  id: string;
  credits: number;
  pricePHP: number;
  label: string;
  popular?: boolean;
}
