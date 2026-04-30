import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { ProductService } from '../services/product.service.js';
import { ProductSchema, ProductCreateSchema, ProductUpdateSchema, ProductQuerySchema } from '../schemas/product.schema.js';
import {
  CursorPaginationSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/common.schema.js';
import type { Product } from '../schemas/product.schema.js';
import type { ProductDocument } from '../models/product.model.js';
import { buildProductFilter } from '../utils/product-query-builder.js';

// Env type for routes that expect auth context
type AuthEnv = {
  Variables: {
    userId: string;
    email: string;
    role: string;
    requestId: string;
  };
};

const productService = new ProductService();

function serializeProduct(product: ProductDocument): Product {
  const json = product.toJSON() as Record<string, unknown>;
  return {
    id: json['id'] as string,
    userId: json['userId'] as string,
    name: json['name'] as string,
    description: json['description'] as string,
    price: json['price'] as number,
    category: json['category'] as Product['category'],
    sku: json['sku'] as string,
    stock: json['stock'] as number,
    active: json['active'] as boolean,
    tags: json['tags'] as string[],
    imageUrl: json['imageUrl'] as string | undefined,
    weight: json['weight'] as number | undefined,
    dimensions: json['dimensions'] as Product['dimensions'],
    createdAt: String(json['createdAt']),
    updatedAt: String(json['updatedAt']),
  };
}

// --- Route definitions ---

const listProductsRoute = createRoute({
  method: 'get',
  path: '/products',
  tags: ['Products'],
  summary: 'List products with pagination and filtering',
  security: [{ Bearer: [] }],
  request: {
    query: CursorPaginationSchema.omit({ sort: true }).extend({
      sort: z.enum(['createdAt', 'updatedAt', 'name', 'price', 'stock']).default('createdAt'),
    }).extend(ProductQuerySchema.shape),
  },
  responses: {
    200: {
      description: 'Paginated product list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ProductSchema),
            pagination: z.object({
              hasNext: z.boolean(),
              nextCursor: z.string().nullable(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const getProductRoute = createRoute({
  method: 'get',
  path: '/products/{id}',
  tags: ['Products'],
  summary: 'Get product by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Product found',
      content: {
        'application/json': {
          schema: ProductSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Access denied',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Product not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createProductRoute = createRoute({
  method: 'post',
  path: '/products',
  tags: ['Products'],
  summary: 'Create a new product',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ProductCreateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Product created',
      content: {
        'application/json': {
          schema: ProductSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const updateProductRoute = createRoute({
  method: 'patch',
  path: '/products/{id}',
  tags: ['Products'],
  summary: 'Update product by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
    body: {
      content: {
        'application/json': {
          schema: ProductUpdateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Product updated',
      content: {
        'application/json': {
          schema: ProductSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Access denied',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Product not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteProductRoute = createRoute({
  method: 'delete',
  path: '/products/{id}',
  tags: ['Products'],
  summary: 'Delete product by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Product deleted',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Access denied',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Product not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// --- Router ---

export const productRouter = new OpenAPIHono<AuthEnv>();

// NOTE: Auth middleware is applied in src/index.ts via app.use('/api/v1/products/*', authMiddleware)

productRouter.openapi(listProductsRoute, async (c) => {
  const userId = c.get('userId');
  const { cursor, limit, sort, order, ...filterParams } = c.req.valid('query');
  const filter = buildProductFilter(filterParams, userId);
  const result = await productService.findAll(userId, filter, { cursor, limit, sort, order });
  return c.json(
    {
      data: result.data.map(serializeProduct),
      pagination: result.pagination,
    },
    200
  );
});

productRouter.openapi(getProductRoute, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('role');
  const { id } = c.req.valid('param');
  const product = await productService.findById(userId, id, userRole);
  return c.json(serializeProduct(product), 200);
});

productRouter.openapi(createProductRoute, async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const product = await productService.create(userId, body);
  return c.json(serializeProduct(product), 201);
});

productRouter.openapi(updateProductRoute, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('role');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const product = await productService.update(userId, id, body, userRole);
  return c.json(serializeProduct(product), 200);
});

productRouter.openapi(deleteProductRoute, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('role');
  const { id } = c.req.valid('param');
  await productService.delete(userId, id, userRole);
  return c.json({ success: true as const, message: 'Product deleted' }, 200);
});
