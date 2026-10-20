export type ReservationStatus = 'ACTIVE' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';
export type ReservationItem = { variant_id: number; quantity: number };
export type ReserveRequest = {
  checkout_ref: string;
  idempotency_key: string;
  items: ReservationItem[];
  ttl_seconds?: number;
};
export type ReserveResult = {
  id: string; checkout_ref: string; status: ReservationStatus;
  expires_at: string; items: ReservationItem[];
};
export type AvailabilityResult = {
  variant_id: number; on_hand_qty: number; reserved_qty: number;
  available_qty: number; status: 'ACTIVE' | 'DISABLED';
};
export class InventoryError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name='InventoryError'; }
}
export function assertPositiveInteger(value: unknown, name: string, upper = 1000000): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value > upper)
    throw new InventoryError('VALIDATION_FAILED', name + ' must be a positive bounded integer');
}
export function assertIdentifier(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 180 ||
      !/^[\w:.-]+$/.test(value))
    throw new InventoryError('VALIDATION_FAILED', name + ' must be a safe 1-180 character identifier');
}
