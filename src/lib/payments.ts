import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';

// Provider-agnostic escrow scaffold. The app talks only to the PaymentGateway
// interface; today it's backed by MockGateway (no real money), and a real
// provider (MyFatoorah / Tap / Stripe Connect) is a drop-in that implements the
// same three moves. The escrow state machine lives on the shipment:
//   none → held (on accept) → released (on delivery) | refunded (on cancel)

export type PaymentStatus = 'none' | 'held' | 'released' | 'refunded';

export type Payment = {
  id: string;
  status: PaymentStatus;
  amountKwd: number;
  gateway: string;
  heldAt: number;
  releasedAt?: number;
  refundedAt?: number;
};

export interface PaymentGateway {
  readonly name: string;
  // Authorize the sender's payment and hold it in escrow. Returns a payment id.
  authorizeAndHold(amountKwd: number, ref: string): Promise<{ id: string }>;
  // Release the held funds to the carrier (on delivery confirmation).
  release(paymentId: string): Promise<void>;
  // Return the held funds to the sender (cancellation / dispute).
  refund(paymentId: string): Promise<void>;
}

// Simulated gateway: succeeds after a short delay, mints deterministic-ish ids.
// Swap this for the real provider without touching any screen or escrow helper.
class MockGateway implements PaymentGateway {
  readonly name = 'mock';
  private seq = 0;
  private wait() {
    return new Promise<void>((r) => setTimeout(r, 500));
  }
  async authorizeAndHold(amountKwd: number, ref: string) {
    await this.wait();
    this.seq += 1;
    return { id: `mock_${ref.replace(/[^a-zA-Z0-9]/g, '')}_${this.seq}` };
  }
  async release(_paymentId: string) {
    await this.wait();
  }
  async refund(_paymentId: string) {
    await this.wait();
  }
}

export const gateway: PaymentGateway = new MockGateway();

// Parse a formatted KWD string ("210.000", "1,250") to a number.
export function parseKwd(v?: string | null): number {
  return parseFloat((v || '').replace(/,/g, '')) || 0;
}

// ── Escrow state machine, persisted on shipments/{id}.payment ───────────────

export async function holdEscrow(shipmentId: string, amountKwd: number): Promise<Payment | null> {
  if (!firestore || !shipmentId || amountKwd <= 0) return null;
  const { id } = await gateway.authorizeAndHold(amountKwd, shipmentId);
  const payment: Payment = { id, status: 'held', amountKwd, gateway: gateway.name, heldAt: Date.now() };
  await updateDoc(doc(firestore, 'shipments', shipmentId), { payment });
  return payment;
}

export async function releaseEscrow(shipmentId: string, payment: Payment): Promise<void> {
  if (!firestore || payment.status !== 'held') return;
  await gateway.release(payment.id);
  await updateDoc(doc(firestore, 'shipments', shipmentId), {
    payment: { ...payment, status: 'released', releasedAt: Date.now() },
    status: 'delivered',
  });
}

export async function refundEscrow(shipmentId: string, payment: Payment): Promise<void> {
  if (!firestore || payment.status !== 'held') return;
  await gateway.refund(payment.id);
  await updateDoc(doc(firestore, 'shipments', shipmentId), {
    payment: { ...payment, status: 'refunded', refundedAt: Date.now() },
  });
}
