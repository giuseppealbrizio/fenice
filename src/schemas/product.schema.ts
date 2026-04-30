import { z } from 'zod';

export const CategoryEnum = z.enum([
  'electronics',
  'clothing',
  'books',
  'home',
  'sports',
  'toys',
  'beauty',
  'automotive',
  'food',
  'other',
]);

export const ProductSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  price: z.number().positive(),
  category: CategoryEnum,
  sku: z.string().min(1).max(100),
  stock: z.number().int().min(0),
  active: z.boolean(),
  tags: z.array(z.string()),
  imageUrl: z.url().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  price: z.number().positive(),
  category: CategoryEnum,
  sku: z.string().min(1).max(100),
  stock: z.number().int().min(0),
  active: z.boolean().default(true).optional(),
  tags: z.array(z.string()).default([]).optional(),
  imageUrl: z.url().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
});

export const ProductUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    price: z.number().positive().optional(),
    category: CategoryEnum.optional(),
    stock: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    imageUrl: z.url().optional(),
    weight: z.number().positive().optional(),
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    }).optional(),
  })
  .strict();

export const ProductQuerySchema = z.object({
  search: z.string().optional(),
  category: CategoryEnum.optional(),
  active: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  inStock: z.coerce.boolean().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;
