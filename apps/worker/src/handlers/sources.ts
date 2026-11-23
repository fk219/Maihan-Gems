/**
 * apps/worker/src/handlers/sources.ts
 *
 * The read side handlers need, expressed as ports.
 *
 * A handler must not hold a repository handle: doc 27 §7 rule 7 says a handler
 * contains no business logic and calls application services. These ports are
 * the seam — production wiring reads through `@maihan/db`, tests pass a plain
 * object, and the handler never knows SQL exists.
 *
 * Only the fields an email prints cross the port. An order's addresses, phone
 * number, notes and payment state do not.
 */
import { ContractError } from '@maihan/contracts';
import { findVendorById, getOrderById, type CatalogDatabase } from '@maihan/db';

export interface OrderEmailFacts {
  /** The delivery address. PII, and the minimum needed to send. */
  readonly email: string;
  /** Greeting name from the shipping address. PII, printed in the greeting. */
  readonly displayName: string | null;
  readonly orderNumber: string;
  readonly currency: string;
  readonly grandTotal: string;
  readonly placedAt: string;
  readonly items: readonly {
    readonly title: string;
    readonly quantity: number;
    readonly lineTotal: string;
  }[];
}

export interface OrderNotificationSource {
  /** Null when the order does not exist; a database error still throws. */
  loadOrder(orderId: string): Promise<OrderEmailFacts | null>;
}

export interface VendorEmailFacts {
  readonly email: string;
  readonly displayName: string;
}

export interface VendorNotificationSource {
  loadVendor(vendorId: string): Promise<VendorEmailFacts | null>;
}

export function createOrderNotificationSource(db: CatalogDatabase): OrderNotificationSource {
  return {
    async loadOrder(orderId: string): Promise<OrderEmailFacts | null> {
      try {
        const order = await getOrderById(db, orderId);
        return {
          email: order.email,
          displayName: order.shipping_address.full_name ?? null,
          orderNumber: order.order_number,
          currency: order.currency,
          grandTotal: order.grand_total,
          placedAt: order.placed_at ?? order.created_at,
          items: order.items.map((item) => ({
            title: item.title_snapshot,
            quantity: item.quantity,
            lineTotal: item.line_total,
          })),
        };
      } catch (error) {
        // A missing order is permanent. Anything else (a timeout, a refused
        // connection) must propagate so the dispatcher retries it.
        if (error instanceof ContractError) return null;
        throw error;
      }
    },
  };
}

export function createVendorNotificationSource(db: CatalogDatabase): VendorNotificationSource {
  return {
    async loadVendor(vendorId: string): Promise<VendorEmailFacts | null> {
      const vendor = await findVendorById(db, vendorId);
      if (vendor === null) return null;
      return { email: vendor.email, displayName: vendor.display_name };
    },
  };
}
