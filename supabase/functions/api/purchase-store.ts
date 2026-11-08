// Reads and writes connections, orders and feedback.
import type { Sql } from "postgres";
import type { PurchaseDetails } from "../_shared/purchase.ts";

const UNIQUE_VIOLATION = "23505";

export type ConnectionRow = {
  id: string;
  providerId: string;
  disconnectedAt: string | null;
};

export type NewOrder = {
  connectionId: string;
  providerId: string;
  details: PurchaseDetails;
  cardLast4: string;
  cardHolder: string;
  cardExpiryMonth: number;
  cardExpiryYear: number;
};

export function createPurchaseStore(sql: Sql) {
  async function createConnection(providerId: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      insert into public.connections (provider_id) values (${providerId})
      returning id`;
    return row!.id;
  }

  async function findConnection(id: string): Promise<ConnectionRow | null> {
    const [row] = await sql<ConnectionRow[]>`
      select id, provider_id as "providerId",
             to_json(disconnected_at)#>>'{}' as "disconnectedAt"
      from public.connections where id = ${id}`;
    return row ?? null;
  }

  /** Returns false when the connection does not exist. */
  async function disconnect(id: string): Promise<boolean> {
    const rows = await sql`
      update public.connections
      set disconnected_at = coalesce(disconnected_at, now())
      where id = ${id}
      returning id`;
    return rows.length === 1;
  }

  /** Returns the new order id, or null when the connection already has an order. */
  async function createOrder(order: NewOrder): Promise<string | null> {
    const d = order.details;
    try {
      const [row] = await sql<{ id: string }[]>`
        insert into public.orders (
          connection_id, provider_id, first_name, surname, address, data_plan,
          contract_start_date, additional_services, needs_router, current_provider,
          card_last4, card_holder, card_expiry_month, card_expiry_year
        ) values (
          ${order.connectionId}, ${order.providerId}, ${d.firstName}, ${d.surname},
          ${d.address}, ${d.dataPlan}, ${d.contractStartDate},
          array(select jsonb_array_elements_text(${sql.json(d.additionalServices ?? [])})),
          ${d.needsRouter ?? null}, ${d.currentProvider ?? null},
          ${order.cardLast4}, ${order.cardHolder}, ${order.cardExpiryMonth}, ${order.cardExpiryYear}
        )
        returning id`;
      return row!.id;
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async function orderExists(id: string): Promise<boolean> {
    const rows = await sql`select 1 from public.orders where id = ${id}`;
    return rows.length === 1;
  }

  /** Returns false when the order already has feedback. */
  async function addFeedback(orderId: string, message: string): Promise<boolean> {
    try {
      await sql`insert into public.feedback (order_id, message) values (${orderId}, ${message})`;
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  return { createConnection, findConnection, disconnect, createOrder, orderExists, addFeedback };
}

export type PurchaseStore = ReturnType<typeof createPurchaseStore>;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;
}
