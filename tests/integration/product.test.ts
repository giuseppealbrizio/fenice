import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testClient } from 'hono/testing';
import { app } from '../../src/index.js';
import { ProductModel } from '../../src/models/product.model.js';

// Mock database models
vi.mock('../../src/models/product.model.js');

const mockProductModel = vi.mocked(ProductModel);

describe('Product API Integration', () => {
  const client = testClient(app);
  let authToken: string;
  let userId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    authToken = 'Bearer mock-jwt-token';
    userId = '64a123456789012345678901';
    
    // Mock auth middleware by setting up JWT verification
    vi.mock('jsonwebtoken', () => ({
      verify: vi.fn().mockReturnValue({
        userId,
        email: 'test@example.com',
        role: 'user',
      }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/products', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        category: 'electronics',
        sku: 'TEST-001',
        stock: 100,
      };

      const mockProduct = {
        _id: 'product-id',
        userId,
        ...productData,
        active: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(undefined),
        toJSON: vi.fn().mockReturnValue({
          id: 'product-id',
          userId,
          ...productData,
          active: true,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      };

      mockProductModel.mockImplementation(() => mockProduct as any);

      const response = await client.api.v1.products.$post(
        {
          json: productData,
        },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.name).toBe(productData.name);
      expect(result.userId).toBe(userId);
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        description: 'Test description',
        price: -10, // Invalid negative price
        category: 'electronics',
        sku: 'TEST-001',
        stock: 100,
      };

      const response = await client.api.v1.products.$post(
        {
          json: invalidData,
        },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/products', () => {
    it('should return paginated products for authenticated user', async () => {
      const mockProducts = [
        {
          _id: 'product-1',
          userId,
          name: 'Product 1',
          get: vi.fn().mockReturnValue('2023-01-01'),
          toJSON: vi.fn().mockReturnValue({
            id: 'product-1',
            userId,
            name: 'Product 1',
            description: 'Description 1',
            price: 29.99,
            category: 'electronics',
            sku: 'PROD-001',
            stock: 10,
            active: true,
            tags: [],
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          }),
        },
      ];

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockProducts),
        }),
      });

      mockProductModel.find = mockFind;

      const response = await client.api.v1.products.$get(
        {},
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Product 1');
      expect(result.pagination).toHaveProperty('hasNext');
      expect(result.pagination).toHaveProperty('nextCursor');
    });

    it('should filter products by search query', async () => {
      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      mockProductModel.find = mockFind;

      const response = await client.api.v1.products.$get(
        {
          query: { search: 'laptop' },
        },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(200);
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          $or: expect.any(Array),
        })
      );
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return product when user owns it', async () => {
      const productId = 'product-id';
      const mockProduct = {
        _id: productId,
        userId,
        name: 'Test Product',
        toJSON: vi.fn().mockReturnValue({
          id: productId,
          userId,
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          sku: 'TEST-001',
          stock: 10,
          active: true,
          tags: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        }),
      };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);

      const response = await client.api.v1.products[':id'].$get(
        { param: { id: productId } },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.id).toBe(productId);
      expect(result.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const productId = 'non-existent-id';

      mockProductModel.findById = vi.fn().mockResolvedValue(null);

      const response = await client.api.v1.products[':id'].$get(
        { param: { id: productId } },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('should update product when user owns it', async () => {
      const productId = 'product-id';
      const updateData = { name: 'Updated Product' };
      const mockProduct = { _id: productId, userId, name: 'Test Product' };
      const updatedProduct = {
        ...mockProduct,
        ...updateData,
        toJSON: vi.fn().mockReturnValue({
          id: productId,
          userId,
          name: 'Updated Product',
          description: 'Test description',
          price: 29.99,
          category: 'electronics',
          sku: 'TEST-001',
          stock: 10,
          active: true,
          tags: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        }),
      };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);
      mockProductModel.findByIdAndUpdate = vi.fn().mockResolvedValue(updatedProduct);

      const response = await client.api.v1.products[':id'].$patch(
        {
          param: { id: productId },
          json: updateData,
        },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.name).toBe('Updated Product');
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('should delete product when user owns it', async () => {
      const productId = 'product-id';
      const mockProduct = { _id: productId, userId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);
      mockProductModel.findByIdAndDelete = vi.fn().mockResolvedValue(mockProduct);

      const response = await client.api.v1.products[':id'].$delete(
        { param: { id: productId } },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Product deleted');
    });

    it('should return 403 when user does not own product', async () => {
      const productId = 'product-id';
      const otherUserId = '64a123456789012345678902';
      const mockProduct = { _id: productId, userId: otherUserId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);

      const response = await client.api.v1.products[':id'].$delete(
        { param: { id: productId } },
        {
          headers: { Authorization: authToken },
        }
      );

      expect(response.status).toBe(403);
    });
  });
});
