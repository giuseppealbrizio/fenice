import { ProductModel, type ProductDocument } from '../models/product.model.js';
import type { ProductCreate, ProductUpdate } from '../schemas/product.schema.js';
import type { PaginatedResponse } from '../schemas/common.schema.js';
import { decodeCursor, encodeCursor } from '../utils/pagination.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class ProductService {
  async create(userId: string, data: ProductCreate): Promise<ProductDocument> {
    const product = new ProductModel({ ...data, userId });
    await product.save();
    return product;
  }

  async findAll(
    userId: string,
    filter: Record<string, unknown>,
    options: {
      cursor?: string | undefined;
      limit?: number | undefined;
      sort?: string | undefined;
      order?: 'asc' | 'desc' | undefined;
    }
  ): Promise<PaginatedResponse<ProductDocument>> {
    const { cursor, limit = 20, sort = 'createdAt', order = 'desc' } = options;
    const cursorData = decodeCursor(cursor);

    const query: Record<string, unknown> = { ...filter };

    if (cursorData) {
      const direction = order === 'desc' ? '$lt' : '$gt';
      query['$or'] = [
        { [sort]: { [direction]: cursorData.sortValue } },
        { [sort]: cursorData.sortValue, _id: { [direction]: cursorData.id } },
      ];
    }

    const sortObj: Record<string, 1 | -1> = {
      [sort]: order === 'desc' ? -1 : 1,
      _id: order === 'desc' ? -1 : 1,
    };

    const products = await ProductModel.find(query)
      .sort(sortObj)
      .limit(limit + 1);

    const hasNext = products.length > limit;
    if (hasNext) products.pop();

    const lastProduct = products[products.length - 1];
    const nextCursor =
      hasNext && lastProduct
        ? encodeCursor({
            id: lastProduct._id.toString(),
            sortValue: String(lastProduct.get(sort)),
          })
        : null;

    return {
      data: products,
      pagination: { hasNext, nextCursor },
    };
  }

  async findById(userId: string, id: string, userRole?: string): Promise<ProductDocument> {
    const product = await ProductModel.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    
    // Allow admins to view any product, otherwise check ownership
    if (userRole !== 'admin' && product.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied');
    }
    
    return product;
  }

  async update(userId: string, id: string, data: ProductUpdate, userRole?: string): Promise<ProductDocument> {
    const product = await ProductModel.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    
    // Allow admins to update any product, otherwise check ownership
    if (userRole !== 'admin' && product.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied');
    }
    
    const updatedProduct = await ProductModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updatedProduct) throw new NotFoundError('Product not found');
    return updatedProduct;
  }

  async delete(userId: string, id: string, userRole?: string): Promise<void> {
    const product = await ProductModel.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    
    // Allow admins to delete any product, otherwise check ownership
    if (userRole !== 'admin' && product.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied');
    }
    
    await ProductModel.findByIdAndDelete(id);
  }
}
