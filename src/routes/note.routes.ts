import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { NoteService } from '../services/note.service.js';
import { 
  NoteSchema, 
  NoteCreateSchema, 
  NoteUpdateSchema, 
  NoteQuerySchema,
  type Note,
} from '../schemas/note.schema.js';
import {
  CursorPaginationSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/common.schema.js';
import type { NoteDocument } from '../models/note.model.js';
import { ForbiddenError } from '../utils/errors.js';

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
    tags: json['tags'] as string[],
    authorId: json['authorId'] as string,
    authorEmail: json['authorEmail'] as string,
    isPrivate: json['isPrivate'] as boolean,
    createdAt: String(json['createdAt']),
    updatedAt: String(json['updatedAt']),
  };
}

function buildNoteFilter(params: {
  search?: string | undefined;
  tags?: string | undefined;
  isPrivate?: boolean | undefined;
  authorId?: string | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.search) {
    filter['$text'] = { $search: params.search };
  }

  if (params.tags) {
    const tagsArray = params.tags.split(',').map(tag => tag.trim());
    filter['tags'] = { $in: tagsArray };
  }

  if (params.isPrivate !== undefined) {
    filter['isPrivate'] = params.isPrivate;
  }

  if (params.authorId) {
    filter['authorId'] = params.authorId;
  }

  if (params.createdAfter || params.createdBefore) {
    const dateFilter: Record<string, Date> = {};
    if (params.createdAfter) {
      dateFilter['$gte'] = new Date(params.createdAfter);
    }
    if (params.createdBefore) {
      dateFilter['$lte'] = new Date(params.createdBefore);
    }
    filter['createdAt'] = dateFilter;
  }

  return filter;
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
    403: {
      description: 'Forbidden — can only access own notes unless admin',
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
    403: {
      description: 'Forbidden — can only update own notes unless admin',
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
    403: {
      description: 'Forbidden — can only delete own notes unless admin',
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
  const { cursor, limit, sort, order, ...filterParams } = c.req.valid('query');
  const userId = c.get('userId');
  const role = c.get('role');
  
  const filter = buildNoteFilter(filterParams);
  
  // Non-admin users can only see their own notes and public notes from others
  if (role !== 'admin' && role !== 'superAdmin') {
    filter['$or'] = [
      { authorId: userId },
      { isPrivate: false },
    ];
  }
  
  const result = await noteService.findAll(filter, { cursor, limit, sort, order });
  return c.json(
    {
      data: result.data.map(serializeNote),
      pagination: result.pagination,
    },
    200
  );
});

noteRouter.openapi(getNoteRoute, async (c) => {
  const { id } = c.req.valid('param');
  const userId = c.get('userId');
  const role = c.get('role');
  
  const note = await noteService.findById(id);
  
  // Check permissions: own notes or public notes, unless admin
  if (role !== 'admin' && role !== 'superAdmin') {
    if (note.authorId !== userId && note.isPrivate) {
      throw new ForbiddenError('Cannot access private note from another user');
    }
  }
  
  return c.json(serializeNote(note), 200);
});

noteRouter.openapi(createNoteRoute, async (c) => {
  const body = c.req.valid('json');
  const userId = c.get('userId');
  const email = c.get('email');
  
  const note = await noteService.create(body, userId, email);
  return c.json(serializeNote(note), 201);
});

noteRouter.openapi(updateNoteRoute, async (c) => {
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const userId = c.get('userId');
  const role = c.get('role');
  
  // Check ownership first
  const existingNote = await noteService.findById(id);
  if (role !== 'admin' && role !== 'superAdmin' && existingNote.authorId !== userId) {
    throw new ForbiddenError('Cannot update note from another user');
  }
  
  const note = await noteService.update(id, body);
  return c.json(serializeNote(note), 200);
});

noteRouter.openapi(deleteNoteRoute, async (c) => {
  const { id } = c.req.valid('param');
  const userId = c.get('userId');
  const role = c.get('role');
  
  // Check ownership first
  const existingNote = await noteService.findById(id);
  if (role !== 'admin' && role !== 'superAdmin' && existingNote.authorId !== userId) {
    throw new ForbiddenError('Cannot delete note from another user');
  }
  
  await noteService.delete(id);
  return c.json({ success: true as const, message: 'Note deleted' }, 200);
});