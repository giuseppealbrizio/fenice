import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { NoteService } from '../services/note.service.js';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema, NoteQuerySchema } from '../schemas/note.schema.js';
import {
  CursorPaginationSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/common.schema.js';
import type { Note } from '../schemas/note.schema.js';
import type { NoteDocument } from '../models/note.model.js';

// Env type for routes that expect auth context
type AuthEnv = {
  Variables: {
    userId: string;
    email: string;
    role: string;
    requestId: string;
  };
};

const noteService = new NoteService();

function serializeNote(note: NoteDocument): Note {
  const json = note.toJSON() as Record<string, unknown>;
  return {
    id: json['id'] as string,
    title: json['title'] as string,
    content: json['content'] as string,
    userId: json['userId'] as string,
    tags: json['tags'] as string[],
    archived: json['archived'] as boolean,
    createdAt: String(json['createdAt']),
    updatedAt: String(json['updatedAt']),
  };
}

// --- Route definitions ---

const listNotesRoute = createRoute({
  method: 'get',
  path: '/notes',
  tags: ['Notes'],
  summary: 'List notes with pagination and filtering',
  security: [{ Bearer: [] }],
  request: {
    query: CursorPaginationSchema.extend(NoteQuerySchema.shape),
  },
  responses: {
    200: {
      description: 'Paginated note list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(NoteSchema),
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

const getNoteRoute = createRoute({
  method: 'get',
  path: '/notes/{id}',
  tags: ['Notes'],
  summary: 'Get note by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Note found',
      content: {
        'application/json': {
          schema: NoteSchema,
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
      description: 'Note not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createNoteRoute = createRoute({
  method: 'post',
  path: '/notes',
  tags: ['Notes'],
  summary: 'Create a new note',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: NoteCreateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Note created',
      content: {
        'application/json': {
          schema: NoteSchema,
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

const updateNoteRoute = createRoute({
  method: 'patch',
  path: '/notes/{id}',
  tags: ['Notes'],
  summary: 'Update note by ID',
  security: [{ Bearer: [] }],
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
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Note updated',
      content: {
        'application/json': {
          schema: NoteSchema,
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
    404: {
      description: 'Note not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteNoteRoute = createRoute({
  method: 'delete',
  path: '/notes/{id}',
  tags: ['Notes'],
  summary: 'Delete note by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Note deleted',
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
    404: {
      description: 'Note not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// --- Router ---

export const noteRouter = new OpenAPIHono<AuthEnv>();

// NOTE: Auth middleware is applied in src/index.ts via app.use('/api/v1/notes/*', authMiddleware)

noteRouter.openapi(listNotesRoute, async (c) => {
  const userId = c.get('userId');
  const { cursor, limit, sort, order, ...queryParams } = c.req.valid('query');
  const result = await noteService.findAll(userId, queryParams, { cursor, limit, sort, order });
  return c.json(
    {
      data: result.data.map(serializeNote),
      pagination: result.pagination,
    },
    200
  );
});

noteRouter.openapi(getNoteRoute, async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const note = await noteService.findById(id, userId);
  return c.json(serializeNote(note), 200);
});

noteRouter.openapi(createNoteRoute, async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const note = await noteService.create(userId, body);
  return c.json(serializeNote(note), 201);
});

noteRouter.openapi(updateNoteRoute, async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const note = await noteService.update(id, userId, body);
  return c.json(serializeNote(note), 200);
});

noteRouter.openapi(deleteNoteRoute, async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.valid('param');
  await noteService.delete(id, userId);
  return c.json({ success: true as const, message: 'Note deleted' }, 200);
});