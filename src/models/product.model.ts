import mongoose, { Schema, type Document } from 'mongoose';
import type { Product } from '../schemas/product.schema.js';
import { CategoryEnum } from '../schemas/product.schema.js';

export interface ProductDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: Product['category'];
  sku: string;
  stock: number;
  active: boolean;
  tags: string[];
  imageUrl?: string | undefined;
  weight?: number | undefined;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  } | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const dimensionsSchema = new Schema(
  {
    length: {
      type: Number,
      required: true,
      min: 0,
    },
    width: {
      type: Number,
      required: true,
      min: 0,
    },
    height: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const productSchema = new Schema<ProductDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: CategoryEnum.options,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    imageUrl: String,
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: dimensionsSchema,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        ret['id'] = String(ret['_id']);
        delete ret['_id'];
        delete ret['__v'];
        ret['userId'] = String(ret['userId']);
        if (ret['createdAt'] instanceof Date) ret['createdAt'] = ret['createdAt'].toISOString();
        if (ret['updatedAt'] instanceof Date) ret['updatedAt'] = ret['updatedAt'].toISOString();
        return ret;
      },
    },
  }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, active: 1 });
productSchema.index({ price: 1 });
productSchema.index({ userId: 1, createdAt: -1 });
productSchema.index({ sku: 1 }, { unique: true });

export const ProductModel = mongoose.model<ProductDocument>('Product', productSchema);
