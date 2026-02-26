import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth.js';
import { NoteService } from '../services/note.service.js';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema, NoteQuerySchema } from '../schemas/note.schema.js';
import { AppError } from '../utils/errors.js';
import type { StatusCode } from 'hono/utils/http-status';

const noteService = new NoteService();

// Response schemas
const NoteListResponseSchema = z.object({
  data: z.array(NoteSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});

const ErrorResponseSchema = z.object({
  message: z.string(),
  details: z.string().optional(),
});

// Routes
const listNotesRoute = createRoute({
  method: 'get',
  path: '/notes',
  tags: ['Notes'],
  summary: 'List notes',
  description: 'Retrieve a paginated list of notes for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    query: NoteQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: NoteListResponseSchema,
        },
      },
      description: 'Notes retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

const getNoteRoute = createRoute({
  method: 'get',
  path: '/notes/{id}',
  tags: ['Notes'],
  summary: 'Get note by ID',
  description: 'Retrieve a specific note by its ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: NoteSchema,
        },
      },
      description: 'Note retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Note not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

const createNoteRoute = createRoute({
  method: 'post',
  path: '/notes',
  tags: ['Notes'],
  summary: 'Create note',
  description: 'Create a new note for the authenticated user',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: NoteCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: NoteSchema,
        },
      },
      description: 'Note created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request body',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

const updateNoteRoute = createRoute({
  method: 'patch',
  path: '/notes/{id}',
  tags: ['Notes'],
  summary: 'Update note',
  description: 'Update an existing note',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
    body: {
      content: {
        'application/json': {
          schema: NoteUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: NoteSchema,
        },
      },
      description: 'Note updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request body',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Note not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

const deleteNoteRoute = createRoute({
  method: 'delete',
  path: '/notes/{id}',
  tags: ['Notes'],
  summary: 'Delete note',
  description: 'Delete an existing note',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    204: {
      description: 'Note deleted successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Note not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

// Router setup
export const noteRoutes = new OpenAPIHono();

// Apply auth middleware to all routes
noteRoutes.use(authMiddleware);

// Route handlers
noteRoutes.openapi(listNotesRoute, async (c) => {
  try {
    const query = c.req.valid('query');
    const user = c.get('user');
    
    const result = await noteService.findMany(user.id, query);
    return c.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ message: error.message }, error.statusCode as StatusCode);
    }
    return c.json({ message: 'Internal server error' }, 500);
  }
});

noteRoutes.openapi(getNoteRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const user = c.get('user');
    
    const note = await noteService.findById(id, user.id);
    return c.json(note);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ message: error.message }, error.statusCode as StatusCode);
    }
    return c.json({ message: 'Internal server error' }, 500);
  }
});

noteRoutes.openapi(createNoteRoute, async (c) => {
  try {
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const note = await noteService.create(user.id, data);
    return c.json(note, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ message: error.message }, error.statusCode as StatusCode);
    }
    return c.json({ message: 'Internal server error' }, 500);
  }
});

noteRoutes.openapi(updateNoteRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const note = await noteService.update(id, user.id, data);
    return c.json(note);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ message: error.message }, error.statusCode as StatusCode);
    }
    return c.json({ message: 'Internal server error' }, 500);
  }
});

noteRoutes.openapi(deleteNoteRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const user = c.get('user');
    
    await noteService.delete(id, user.id);
    return c.body(null, 204);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ message: error.message }, error.statusCode as StatusCode);
    }
    return c.json({ message: 'Internal server error' }, 500);
  }
});