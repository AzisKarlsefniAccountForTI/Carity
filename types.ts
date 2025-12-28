
export type SaverName = 'Azis Khoirul' | 'Siska Icha';

export type AIAction = 'deposit' | 'vault_lock' | 'vault_release';

export interface Transaction {
  id: string;
  saver: SaverName;
  amount: number;
  date: string;
  note: string;
}

export interface VaultLog {
  id: string;
  amount: number;
  type: 'lock' | 'release';
  reason: string;
  date: string;
}

export interface AppState {
  transactions: Transaction[];
  emergencyFundAmount: number;
  vaultLogs: VaultLog[];
  isEncrypted: boolean;
}

export interface AIResult {
  action: AIAction;
  saver?: SaverName;
  amount: number;
  note: string;
  reason?: string;
  confidence: number;
}
