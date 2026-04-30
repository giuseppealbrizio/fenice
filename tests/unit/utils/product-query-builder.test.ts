import { describe, it, expect } from 'vitest';
import { buildProductFilter } from '../../../src/utils/product-query-builder.js';

describe('buildProductFilter', () => {
  const userId = '64a123456789012345678901';

  it('should always include userId in filter', () => {
    const filter = buildProductFilter({}, userId);
    expect(filter).toEqual({ userId });
  });

  it('should handle search parameter with regex', () => {
    const filter = buildProductFilter({ search: 'laptop' }, userId);
    expect(filter).toEqual({
      userId,
      $or: [
        { name: { $regex: /laptop/i } },
        { description: { $regex: /laptop/i } },
        { sku: { $regex: /laptop/i } },
        { tags: { $in: [/laptop/i] } },
      ],
    });
  });

  it('should escape regex special characters in search', () => {
    const filter = buildProductFilter({ search: 'test.product+' }, userId);
    const escapedRegex = /test\.product\+/i;
    expect(filter).toEqual({
      userId,
      $or: [
        { name: { $regex: escapedRegex } },
        { description: { $regex: escapedRegex } },
        { sku: { $regex: escapedRegex } },
        { tags: { $in: [escapedRegex] } },
      ],
    });
  });

  it('should not add search filter for empty string', () => {
    const filter = buildProductFilter({ search: '' }, userId);
    expect(filter).toEqual({ userId });
  });

  it('should handle category filter', () => {
    const filter = buildProductFilter({ category: 'electronics' }, userId);
    expect(filter).toEqual({
      userId,
      category: 'electronics',
    });
  });

  it('should handle active filter', () => {
    const filter = buildProductFilter({ active: true }, userId);
    expect(filter).toEqual({
      userId,
      active: true,
    });
  });

  it('should handle price range filters', () => {
    const filter = buildProductFilter({ minPrice: 10, maxPrice: 100 }, userId);
    expect(filter).toEqual({
      userId,
      price: {
        $gte: 10,
        $lte: 100,
      },
    });
  });

  it('should handle minPrice only', () => {
    const filter = buildProductFilter({ minPrice: 50 }, userId);
    expect(filter).toEqual({
      userId,
      price: { $gte: 50 },
    });
  });

  it('should handle maxPrice only', () => {
    const filter = buildProductFilter({ maxPrice: 200 }, userId);
    expect(filter).toEqual({
      userId,
      price: { $lte: 200 },
    });
  });

  it('should handle inStock filter for products in stock', () => {
    const filter = buildProductFilter({ inStock: true }, userId);
    expect(filter).toEqual({
      userId,
      stock: { $gt: 0 },
    });
  });

  it('should handle inStock filter for out of stock products', () => {
    const filter = buildProductFilter({ inStock: false }, userId);
    expect(filter).toEqual({
      userId,
      stock: { $eq: 0 },
    });
  });

  it('should handle date range filters', () => {
    const createdAfter = '2023-01-01T00:00:00.000Z';
    const createdBefore = '2023-12-31T23:59:59.999Z';
    
    const filter = buildProductFilter({ createdAfter, createdBefore }, userId);
    expect(filter).toEqual({
      userId,
      createdAt: {
        $gte: new Date(createdAfter),
        $lte: new Date(createdBefore),
      },
    });
  });

  it('should handle combined filters', () => {
    const params = {
      search: 'laptop',
      category: 'electronics',
      active: true,
      minPrice: 500,
      maxPrice: 2000,
      inStock: true,
    };
    
    const filter = buildProductFilter(params, userId);
    expect(filter).toEqual({
      userId,
      $or: [
        { name: { $regex: /laptop/i } },
        { description: { $regex: /laptop/i } },
        { sku: { $regex: /laptop/i } },
        { tags: { $in: [/laptop/i] } },
      ],
      category: 'electronics',
      active: true,
      price: {
        $gte: 500,
        $lte: 2000,
      },
      stock: { $gt: 0 },
    });
  });

  it('should handle empty parameters', () => {
    const filter = buildProductFilter({}, userId);
    expect(filter).toEqual({ userId });
  });

  it('should handle undefined values', () => {
    const params = {
      search: undefined,
      category: undefined,
      active: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
    };
    
    const filter = buildProductFilter(params, userId);
    expect(filter).toEqual({ userId });
  });
});
