import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from '../../../src/services/product.service.js';
import { ProductModel } from '../../../src/models/product.model.js';
import { NotFoundError, ForbiddenError } from '../../../src/utils/errors.js';
import * as pagination from '../../../src/utils/pagination.js';

// Mock the dependencies
vi.mock('../../../src/models/product.model.js');
vi.mock('../../../src/utils/pagination.js');

const mockProductModel = vi.mocked(ProductModel);
const mockDecodeCursor = vi.mocked(pagination.decodeCursor);
const mockEncodeCursor = vi.mocked(pagination.encodeCursor);

describe('ProductService', () => {
  let productService: ProductService;
  const userId = '64a123456789012345678901';
  const adminUserId = '64a123456789012345678902';
  const otherUserId = '64a123456789012345678903';

  beforeEach(() => {
    productService = new ProductService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        category: 'electronics' as const,
        sku: 'TEST-001',
        stock: 100,
      };

      const mockProduct = {
        _id: 'product-id',
        userId,
        ...productData,
        save: vi.fn().mockResolvedValue(undefined),
      };

      mockProductModel.mockImplementation(() => mockProduct as any);

      const result = await productService.create(userId, productData);

      expect(mockProductModel).toHaveBeenCalledWith({ ...productData, userId });
      expect(mockProduct.save).toHaveBeenCalled();
      expect(result).toBe(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const filter = { userId };
      const options = { limit: 10, sort: 'createdAt', order: 'desc' as const };
      
      const mockProducts = [
        { _id: 'id1', name: 'Product 1', get: vi.fn().mockReturnValue('2023-01-01') },
        { _id: 'id2', name: 'Product 2', get: vi.fn().mockReturnValue('2023-01-02') },
      ];

      mockDecodeCursor.mockReturnValue(null);
      mockEncodeCursor.mockReturnValue('cursor123');

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockProducts),
        }),
      });

      mockProductModel.find = mockFind;

      const result = await productService.findAll(userId, filter, options);

      expect(mockFind).toHaveBeenCalledWith(filter);
      expect(result).toEqual({
        data: mockProducts,
        pagination: { hasNext: false, nextCursor: null },
      });
    });

    it('should handle cursor pagination', async () => {
      const filter = { userId };
      const options = { cursor: 'cursor123', limit: 10, sort: 'createdAt', order: 'desc' as const };
      
      const cursorData = { id: 'cursor-id', sortValue: '2023-01-01' };
      mockDecodeCursor.mockReturnValue(cursorData);

      const expectedQuery = {
        userId,
        $or: [
          { createdAt: { $lt: '2023-01-01' } },
          { createdAt: '2023-01-01', _id: { $lt: 'cursor-id' } },
        ],
      };

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      mockProductModel.find = mockFind;

      await productService.findAll(userId, filter, options);

      expect(mockFind).toHaveBeenCalledWith(expectedQuery);
    });
  });

  describe('findById', () => {
    it('should return product when user owns it', async () => {
      const productId = 'product-id';
      const mockProduct = { _id: productId, userId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);

      const result = await productService.findById(userId, productId);

      expect(mockProductModel.findById).toHaveBeenCalledWith(productId);
      expect(result).toBe(mockProduct);
    });

    it('should return product when user is admin', async () => {
      const productId = 'product-id';
      const mockProduct = { _id: productId, userId: otherUserId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);

      const result = await productService.findById(adminUserId, productId, 'admin');

      expect(result).toBe(mockProduct);
    });

    it('should throw ForbiddenError when user does not own product and is not admin', async () => {
      const productId = 'product-id';
      const mockProduct = { _id: productId, userId: otherUserId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);

      await expect(productService.findById(userId, productId)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      const productId = 'non-existent-id';

      mockProductModel.findById = vi.fn().mockResolvedValue(null);

      await expect(productService.findById(userId, productId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update product when user owns it', async () => {
      const productId = 'product-id';
      const updateData = { name: 'Updated Product' };
      const mockProduct = { _id: productId, userId, name: 'Test Product' };
      const updatedProduct = { ...mockProduct, ...updateData };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);
      mockProductModel.findByIdAndUpdate = vi.fn().mockResolvedValue(updatedProduct);

      const result = await productService.update(userId, productId, updateData);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        productId,
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toBe(updatedProduct);
    });

    it('should allow admin to update any product', async () => {
      const productId = 'product-id';
      const updateData = { name: 'Updated Product' };
      const mockProduct = { _id: productId, userId: otherUserId, name: 'Test Product' };
      const updatedProduct = { ...mockProduct, ...updateData };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);
      mockProductModel.findByIdAndUpdate = vi.fn().mockResolvedValue(updatedProduct);

      const result = await productService.update(adminUserId, productId, updateData, 'admin');

      expect(result).toBe(updatedProduct);
    });

    it('should throw ForbiddenError when user does not own product', async () => {
      const productId = 'product-id';
      const updateData = { name: 'Updated Product' };
      const mockProduct = { _id: productId, userId: otherUserId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);

      await expect(productService.update(userId, productId, updateData)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('should delete product when user owns it', async () => {
      const productId = 'product-id';
      const mockProduct = { _id: productId, userId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);
      mockProductModel.findByIdAndDelete = vi.fn().mockResolvedValue(mockProduct);

      await productService.delete(userId, productId);

      expect(mockProductModel.findByIdAndDelete).toHaveBeenCalledWith(productId);
    });

    it('should allow admin to delete any product', async () => {
      const productId = 'product-id';
      const mockProduct = { _id: productId, userId: otherUserId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);
      mockProductModel.findByIdAndDelete = vi.fn().mockResolvedValue(mockProduct);

      await productService.delete(adminUserId, productId, 'admin');

      expect(mockProductModel.findByIdAndDelete).toHaveBeenCalledWith(productId);
    });

    it('should throw ForbiddenError when user does not own product', async () => {
      const productId = 'product-id';
      const mockProduct = { _id: productId, userId: otherUserId, name: 'Test Product' };

      mockProductModel.findById = vi.fn().mockResolvedValue(mockProduct);

      await expect(productService.delete(userId, productId)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      const productId = 'non-existent-id';

      mockProductModel.findById = vi.fn().mockResolvedValue(null);

      await expect(productService.delete(userId, productId)).rejects.toThrow(NotFoundError);
    });
  });
});
