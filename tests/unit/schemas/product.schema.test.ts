import { describe, it, expect } from 'vitest';
import { ProductSchema, ProductCreateSchema, ProductUpdateSchema } from '../../../src/schemas/product.schema.js';

describe('ProductSchema', () => {
  it('should validate a correct product object', () => {
    const product = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Product',
      description: 'A great test product',
      price: 29.99,
      category: 'electronics',
      sku: 'TEST-001',
      stock: 100,
      active: true,
      tags: ['test', 'electronics'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = ProductSchema.safeParse(product);
    expect(result.success).toBe(true);
  });

  it('should reject invalid price', () => {
    const product = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Product',
      description: 'A great test product',
      price: -10, // Invalid negative price
      category: 'electronics',
      sku: 'TEST-001',
      stock: 100,
      active: true,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = ProductSchema.safeParse(product);
    expect(result.success).toBe(false);
  });

  it('should accept product with optional dimensions', () => {
    const product = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Product',
      description: 'A great test product',
      price: 29.99,
      category: 'electronics',
      sku: 'TEST-001',
      stock: 100,
      active: true,
      tags: [],
      dimensions: {
        length: 10.5,
        width: 5.2,
        height: 3.1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = ProductSchema.safeParse(product);
    expect(result.success).toBe(true);
  });
});

describe('ProductCreateSchema', () => {
  it('should validate product creation input', () => {
    const input = {
      name: 'New Product',
      description: 'A brand new product',
      price: 49.99,
      category: 'books',
      sku: 'NEW-001',
      stock: 50,
    };
    const result = ProductCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const input = {
      name: '', // Invalid empty name
      description: 'A brand new product',
      price: 49.99,
      category: 'books',
      sku: 'NEW-001',
      stock: 50,
    };
    const result = ProductCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative stock', () => {
    const input = {
      name: 'New Product',
      description: 'A brand new product',
      price: 49.99,
      category: 'books',
      sku: 'NEW-001',
      stock: -5, // Invalid negative stock
    };
    const result = ProductCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const input = {
      name: 'New Product',
      description: 'A brand new product',
      price: 49.99,
      category: 'books',
      sku: 'NEW-001',
      stock: 50,
      tags: ['new', 'bestseller'],
      imageUrl: 'https://example.com/product.jpg',
      weight: 2.5,
    };
    const result = ProductCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('ProductUpdateSchema', () => {
  it('should validate partial product updates', () => {
    const update = {
      name: 'Updated Product Name',
      price: 39.99,
    };
    const result = ProductUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should reject unknown fields due to strict mode', () => {
    const update = {
      name: 'Updated Product Name',
      unknownField: 'should be rejected', // Unknown field
    };
    const result = ProductUpdateSchema.safeParse(update);
    expect(result.success).toBe(false);
  });

  it('should accept empty update object', () => {
    const update = {};
    const result = ProductUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });
});
