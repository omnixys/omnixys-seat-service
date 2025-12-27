/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Computes the next order index within a model's scope.
 * Rule: Order B → Only compute auto order if none provided.
 */
export async function nextOrder(model: any, where: any): Promise<number> {
  const max = await model.aggregate({
    where,
    _max: { order: true },
  });

  return (max._max.order ?? 0) + 1;
}

/**
 * Assigns order indexes for list-based creation flows.
 */
export function withAutoOrder<T extends Record<string, any>>(
  items: T[],
): Array<T & { order: number }> {
  return items.map((item, index) => ({
    ...item,
    order: typeof item.order === 'number' ? item.order : index,
  }));
}
