import type { FilterQuery } from 'mongoose';
import { NoteModel, type NoteDocument } from '../models/note.model.js';
import type { Note, NoteCreate, NoteUpdate, NoteQuery } from '../schemas/note.schema.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';

export class NoteService {
  async create(userId: string, data: NoteCreate): Promise<Note> {
    const note = new NoteModel({
      ...data,
      userId,
    });

    try {
      const savedNote = await note.save();
      return savedNote.toJSON() as Note;
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        throw new ValidationError([{ message: 'Invalid note data' }]);
      }
      throw error;
    }
  }

  async findById(id: string, userId: string): Promise<Note> {
    const note = await NoteModel.findById(id).lean();
    
    if (!note) {
      throw new NotFoundError('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenError('Access denied to this note');
    }

    return {
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      userId: note.userId,
      tags: note.tags || [],
      pinned: note.pinned || false,
      archived: note.archived || false,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async findMany(userId: string, query: NoteQuery): Promise<{
    data: Note[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const filter: FilterQuery<NoteDocument> = { userId };

    // Apply filters
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    if (query.tags) {
      const tagArray = query.tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    if (query.pinned !== undefined) {
      filter.pinned = query.pinned;
    }

    if (query.archived !== undefined) {
      filter.archived = query.archived;
    }

    if (query.createdAfter || query.createdBefore) {
      filter.createdAt = {};
      if (query.createdAfter) {
        filter.createdAt.$gte = new Date(query.createdAfter);
      }
      if (query.createdBefore) {
        filter.createdAt.$lte = new Date(query.createdBefore);
      }
    }

    // Cursor-based pagination
    if (query.cursor) {
      filter._id = { $lt: query.cursor };
    }

    const notes = await NoteModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .lean();

    const hasMore = notes.length > query.limit;
    const data = notes.slice(0, query.limit);

    const transformedData: Note[] = data.map(note => ({
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      userId: note.userId,
      tags: note.tags || [],
      pinned: note.pinned || false,
      archived: note.archived || false,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));

    const nextCursor = hasMore && data.length > 0 
      ? data[data.length - 1]?._id.toString()
      : undefined;

    return {
      data: transformedData,
      nextCursor,
      hasMore,
    };
  }

  async update(id: string, userId: string, data: NoteUpdate): Promise<Note> {
    const note = await NoteModel.findById(id);
    
    if (!note) {
      throw new NotFoundError('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenError('Access denied to this note');
    }

    Object.assign(note, data);

    try {
      const updatedNote = await note.save();
      return updatedNote.toJSON() as Note;
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        throw new ValidationError([{ message: 'Invalid note data' }]);
      }
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    const note = await NoteModel.findById(id);
    
    if (!note) {
      throw new NotFoundError('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenError('Access denied to this note');
    }

    await note.deleteOne();
  }

  async countByUser(userId: string): Promise<number> {
    return NoteModel.countDocuments({ userId });
  }
}