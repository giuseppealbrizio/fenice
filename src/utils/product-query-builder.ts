interface ProductFilterParams {
  search?: string | undefined;
  category?: string | undefined;
  active?: boolean | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStock?: boolean | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildProductFilter(params: ProductFilterParams, userId: string): Record<string, unknown> {
  const filter: Record<string, unknown> = { userId };

  if (params.search && params.search.trim() !== '') {
    const regex = new RegExp(escapeRegex(params.search), 'i');
    filter['$or'] = [
      { name: { $regex: regex } },
      { description: { $regex: regex } },
      { sku: { $regex: regex } },
      { tags: { $in: [regex] } },
    ];
  }

  if (params.category) {
    filter['category'] = params.category;
  }

  if (params.active !== undefined) {
    filter['active'] = params.active;
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const priceFilter: Record<string, number> = {};
    if (params.minPrice !== undefined) {
      priceFilter['$gte'] = params.minPrice;
    }
    if (params.maxPrice !== undefined) {
      priceFilter['$lte'] = params.maxPrice;
    }
    filter['price'] = priceFilter;
  }

  if (params.inStock === true) {
    filter['stock'] = { $gt: 0 };
  } else if (params.inStock === false) {
    filter['stock'] = { $eq: 0 };
  }

  if (params.createdAfter || params.createdBefore) {
    const dateFilter: Record<string, Date> = {};
    if (params.createdAfter) {
      dateFilter['$gte'] = new Date(params.createdAfter);
    }
    if (params.createdBefore) {
      dateFilter['$lte'] = new Date(params.createdBefore);
    }
    filter['createdAt'] = dateFilter;
  }

  return filter;
}
