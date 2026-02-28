import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { TodoService } from '../services/todo.service.js';
import { TodoSchema, TodoCreateSchema, TodoUpdateSchema, TodoQuerySchema } from '../schemas/todo.schema.js';
import {
  CursorPaginationSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/common.schema.js';
import type { Todo } from '../schemas/todo.schema.js';
import type { TodoDocument } from '../models/todo.model.js';
import { buildTodoFilter } from '../utils/todo-query-builder.js';

// Env type for routes that expect auth context
type AuthEnv = {
  Variables: {
    userId: string;
    email: string;
    role: string;
    requestId: string;
  };
};

const todoService = new TodoService();

function serializeTodo(todo: TodoDocument): Todo {
  const json = todo.toJSON() as Record<string, unknown>;
  return {
    id: json['id'] as string,
    userId: json['userId'] as string,
    title: json['title'] as string,
    description: json['description'] as string | undefined,
    status: json['status'] as Todo['status'],
    priority: json['priority'] as Todo['priority'],
    dueDate: json['dueDate'] ? String(json['dueDate']) : undefined,
    completed: json['completed'] as boolean,
    createdAt: String(json['createdAt']),
    updatedAt: String(json['updatedAt']),
  };
}

// --- Route definitions ---

const listTodosRoute = createRoute({
  method: 'get',
  path: '/todos',
  tags: ['Todos'],
  summary: 'List todos with pagination and filtering',
  security: [{ Bearer: [] }],
  request: {
    query: CursorPaginationSchema.omit({ sort: true }).extend({
      sort: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status']).default('createdAt'),
    }).extend(TodoQuerySchema.shape),
  },
  responses: {
    200: {
      description: 'Paginated todo list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(TodoSchema),
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

const getTodoRoute = createRoute({
  method: 'get',
  path: '/todos/{id}',
  tags: ['Todos'],
  summary: 'Get todo by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Todo found',
      content: {
        'application/json': {
          schema: TodoSchema,
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
    404: {
      description: 'Todo not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createTodoRoute = createRoute({
  method: 'post',
  path: '/todos',
  tags: ['Todos'],
  summary: 'Create a new todo',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: TodoCreateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Todo created',
      content: {
        'application/json': {
          schema: TodoSchema,
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

const updateTodoRoute = createRoute({
  method: 'patch',
  path: '/todos/{id}',
  tags: ['Todos'],
  summary: 'Update todo by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
    body: {
      content: {
        'application/json': {
          schema: TodoUpdateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Todo updated',
      content: {
        'application/json': {
          schema: TodoSchema,
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
      description: 'Forbidden — not authorized to update this todo',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Todo not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteTodoRoute = createRoute({
  method: 'delete',
  path: '/todos/{id}',
  tags: ['Todos'],
  summary: 'Delete todo by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Todo deleted',
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
      description: 'Forbidden — not authorized to delete this todo',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Todo not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// --- Router ---

export const todoRouter = new OpenAPIHono<AuthEnv>();

// NOTE: Auth middleware is applied in src/index.ts via app.use('/api/v1/todos/*', authMiddleware)

todoRouter.openapi(listTodosRoute, async (c) => {
  const userId = c.get('userId');
  const { cursor, limit, sort, order, ...filterParams } = c.req.valid('query');
  const filter = buildTodoFilter(filterParams, userId);
  const result = await todoService.findAll(filter, { cursor, limit, sort, order });
  return c.json(
    {
      data: result.data.map(serializeTodo),
      pagination: result.pagination,
    },
    200
  );
});

todoRouter.openapi(getTodoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const userId = c.get('userId');
  const todo = await todoService.findById(id, userId);
  return c.json(serializeTodo(todo), 200);
});

todoRouter.openapi(createTodoRoute, async (c) => {
  const body = c.req.valid('json');
  const userId = c.get('userId');
  const todo = await todoService.create(body, userId);
  return c.json(serializeTodo(todo), 201);
});

todoRouter.openapi(updateTodoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const userId = c.get('userId');
  const userRole = c.get('role');
  const todo = await todoService.update(id, body, userId, userRole);
  return c.json(serializeTodo(todo), 200);
});

todoRouter.openapi(deleteTodoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const userId = c.get('userId');
  const userRole = c.get('role');
  await todoService.delete(id, userId, userRole);
  return c.json({ success: true as const, message: 'Todo deleted' }, 200);
});
