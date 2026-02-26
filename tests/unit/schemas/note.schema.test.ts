import { describe, it, expect } from 'vitest';
import {
  NoteSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  NoteQuerySchema,
  type Note,
  type NoteCreate,
  type NoteUpdate,
  type NoteQuery,
} from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  const validNote: Note = {
    id: '507f1f77bcf86cd799439011',
    title: 'Test Note',
    content: 'This is a test note content',
    userId: '507f1f77bcf86cd799439012',
    tags: ['test', 'example'],
    pinned: false,
    archived: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('should validate a valid note', () => {
    const result = NoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('should apply default values for optional fields', () => {
    const noteWithoutOptional = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test Note',
      content: 'Content',
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.parse(noteWithoutOptional);
    expect(result.tags).toEqual([]);
    expect(result.pinned).toBe(false);
    expect(result.archived).toBe(false);
  });

  it('should reject note with empty title', () => {
    const invalidNote = { ...validNote, title: '' };
    const result = NoteSchema.safeParse(invalidNote);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_small');
    }
  });

  it('should reject note with title too long', () => {
    const invalidNote = { ...validNote, title: 'a'.repeat(201) };
    const result = NoteSchema.safeParse(invalidNote);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_big');
    }
  });

  it('should reject note with content too long', () => {
    const invalidNote = { ...validNote, content: 'a'.repeat(10001) };
    const result = NoteSchema.safeParse(invalidNote);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_big');
    }
  });

  it('should reject note with invalid tag', () => {
    const invalidNote = { ...validNote, tags: [''] };
    const result = NoteSchema.safeParse(invalidNote);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_small');
    }
  });

  it('should reject note with tag too long', () => {
    const invalidNote = { ...validNote, tags: ['a'.repeat(51)] };
    const result = NoteSchema.safeParse(invalidNote);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_big');
    }
  });

  it('should reject note with invalid datetime', () => {
    const invalidNote = { ...validNote, createdAt: 'invalid-date' };
    const result = NoteSchema.safeParse(invalidNote);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('invalid_string');
    }
  });
});

describe('NoteCreateSchema', () => {
  const validNoteCreate: NoteCreate = {
    title: 'New Note',
    content: 'This is a new note',
    tags: ['tag1', 'tag2'],
    pinned: true,
  };

  it('should validate a valid note creation payload', () => {
    const result = NoteCreateSchema.safeParse(validNoteCreate);
    expect(result.success).toBe(true);
  });

  it('should validate note creation payload with only required fields', () => {
    const minimalCreate = {
      title: 'Minimal Note',
      content: 'Content',
    };

    const result = NoteCreateSchema.safeParse(minimalCreate);
    expect(result.success).toBe(true);
  });

  it('should reject note creation with missing title', () => {
    const invalidCreate = { ...validNoteCreate };
    delete (invalidCreate as Record<string, unknown>).title;
    
    const result = NoteCreateSchema.safeParse(invalidCreate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('invalid_type');
    }
  });

  it('should reject note creation with missing content', () => {
    const invalidCreate = { ...validNoteCreate };
    delete (invalidCreate as Record<string, unknown>).content;
    
    const result = NoteCreateSchema.safeParse(invalidCreate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('invalid_type');
    }
  });

  it('should reject note creation with empty title', () => {
    const invalidCreate = { ...validNoteCreate, title: '' };
    const result = NoteCreateSchema.safeParse(invalidCreate);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_small');
    }
  });
});

describe('NoteUpdateSchema', () => {
  const validNoteUpdate: NoteUpdate = {
    title: 'Updated Note',
    content: 'Updated content',
    tags: ['updated'],
    pinned: true,
    archived: false,
  };

  it('should validate a valid note update payload', () => {
    const result = NoteUpdateSchema.safeParse(validNoteUpdate);
    expect(result.success).toBe(true);
  });

  it('should validate partial update payload', () => {
    const partialUpdate = { title: 'Only Title Update' };
    const result = NoteUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it('should validate empty update payload', () => {
    const emptyUpdate = {};
    const result = NoteUpdateSchema.safeParse(emptyUpdate);
    expect(result.success).toBe(true);
  });

  it('should reject update with empty title', () => {
    const invalidUpdate = { title: '' };
    const result = NoteUpdateSchema.safeParse(invalidUpdate);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_small');
    }
  });

  it('should reject update with extra fields due to strict mode', () => {
    const invalidUpdate = { ...validNoteUpdate, extraField: 'not allowed' };
    const result = NoteUpdateSchema.safeParse(invalidUpdate);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('unrecognized_keys');
    }
  });
});

describe('NoteQuerySchema', () => {
  it('should validate empty query', () => {
    const result = NoteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20); // default value
    }
  });

  it('should validate query with all fields', () => {
    const query: NoteQuery = {
      search: 'test',
      tags: 'tag1,tag2',
      pinned: true,
      archived: false,
      createdAfter: '2024-01-01T00:00:00.000Z',
      createdBefore: '2024-12-31T23:59:59.999Z',
      cursor: '507f1f77bcf86cd799439011',
      limit: 50,
    };

    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it('should coerce boolean values', () => {
    const query = {
      pinned: 'true',
      archived: 'false',
    };

    const result = NoteQuerySchema.parse(query);
    expect(result.pinned).toBe(true);
    expect(result.archived).toBe(false);
  });

  it('should coerce and validate limit', () => {
    const query = { limit: '25' };
    const result = NoteQuerySchema.parse(query);
    expect(result.limit).toBe(25);
  });

  it('should reject limit too high', () => {
    const query = { limit: 101 };
    const result = NoteQuerySchema.safeParse(query);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_big');
    }
  });

  it('should reject limit too low', () => {
    const query = { limit: 0 };
    const result = NoteQuerySchema.safeParse(query);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('too_small');
    }
  });

  it('should reject invalid datetime', () => {
    const query = { createdAfter: 'invalid-date' };
    const result = NoteQuerySchema.safeParse(query);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.code).toBe('invalid_string');
    }
  });
});

describe('Type inference', () => {
  it('should infer correct Note type', () => {
    const note: Note = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test',
      content: 'Content',
      userId: '507f1f77bcf86cd799439012',
      tags: [],
      pinned: false,
      archived: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    expect(typeof note.id).toBe('string');
    expect(typeof note.title).toBe('string');
    expect(typeof note.content).toBe('string');
    expect(typeof note.userId).toBe('string');
    expect(Array.isArray(note.tags)).toBe(true);
    expect(typeof note.pinned).toBe('boolean');
    expect(typeof note.archived).toBe('boolean');
    expect(typeof note.createdAt).toBe('string');
    expect(typeof note.updatedAt).toBe('string');
  });

  it('should infer correct NoteCreate type', () => {
    const createData: NoteCreate = {
      title: 'New Note',
      content: 'Content',
    };

    expect(typeof createData.title).toBe('string');
    expect(typeof createData.content).toBe('string');
  });

  it('should infer correct NoteUpdate type', () => {
    const updateData: NoteUpdate = {
      title: 'Updated Title',
    };

    expect(typeof updateData.title).toBe('string');
  });

  it('should infer correct NoteQuery type', () => {
    const queryData: NoteQuery = {
      search: 'test',
      limit: 10,
    };

    expect(typeof queryData.search).toBe('string');
    expect(typeof queryData.limit).toBe('number');
  });
});