import { MAX_ADDRESSES } from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';

/**
 * Saves a checkout's delivery address for a signed-in customer who asked for it, inside the order
 * transaction. Skipped when the same address is already saved or the address book is full.
 */
export async function saveAddressFromCheckout(
  tx: Prisma.TransactionClient,
  userId: string,
  address: {
    recipientName: string;
    phone: string;
    regionCode: string;
    city: string;
    addressLine: string;
    landmark: string | null;
  },
): Promise<void> {
  const existing = await tx.customerAddress.findMany({
    where: { userId },
    select: { recipientName: true, phone: true, regionCode: true, city: true, addressLine: true },
  });
  const same = existing.some(
    (row) =>
      row.regionCode === address.regionCode &&
      row.city.toLowerCase() === address.city.toLowerCase() &&
      row.addressLine.toLowerCase() === address.addressLine.toLowerCase() &&
      row.phone === address.phone &&
      row.recipientName.toLowerCase() === address.recipientName.toLowerCase(),
  );
  if (same || existing.length >= MAX_ADDRESSES) return;
  await tx.customerAddress.create({
    data: { ...address, label: null, userId, isDefault: existing.length === 0 },
  });
}
