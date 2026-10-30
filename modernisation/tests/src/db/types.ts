/**
 * Persistence side effects the business cares about, independent of schema.
 * A rebuild with a different schema supplies its own implementation.
 */
export interface DbProbe {
  customerByEmail(email: string): Promise<{ id: number; firstName: string; lastName: string; passwordHash: string; newsletter: boolean; defaultAddressCity: string | null } | null>;
  latestOrderForEmail(email: string): Promise<{
    id: number;
    status: string;
    paymentMethod: string;
    currency: string;
    lines: { name: string; quantity: number; unitPrice: number; taxRate: number }[];
    totals: { code: string; value: number }[];
    statusHistoryCount: number;
  } | null>;
  productStock(name: string): Promise<{ quantity: number; ordered: number } | null>;
  productByName(name: string): Promise<{ price: number; quantity: number; active: boolean; categories: string[] } | null>;
  close(): Promise<void>;
}
