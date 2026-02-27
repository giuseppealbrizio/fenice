import { NoteModel, type NoteDocument } from '../models/note.model.js';
import type { NoteCreate, NoteUpdate } from '../schemas/note.schema.js';
import type { PaginatedResponse } from '../schemas/common.schema.js';
import { decodeCursor, encodeCursor } from '../utils/pagination.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class NoteService {
  async findAll(
    filter: Record<string, unknown>,
    options: {
      cursor?: string;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse<NoteDocument>> {
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

    const notes = await NoteModel.find(query)
      .sort(sortObj)
      .limit(limit + 1);

    const hasNext = notes.length > limit;
    if (hasNext) notes.pop();

    const lastNote = notes[notes.length - 1];
    const nextCursor =
      hasNext && lastNote
        ? encodeCursor({
            id: lastNote._id.toString(),
            sortValue: String(lastNote.get(sort)),
          })
        : null;

    return {
      data: notes,
      pagination: { hasNext, nextCursor },
    };
  }

  async findById(id: string, userId?: string): Promise<NoteDocument> {
    const note = await NoteModel.findById(id);
    if (!note) throw new NotFoundError('Note not found');

    // If userId is provided, check ownership or public visibility
    if (userId && note.userId.toString() !== userId && !note.isPublic) {
      throw new ForbiddenError('Access denied');
    }

    return note;
  }

  async create(data: NoteCreate, userId: string): Promise<NoteDocument> {
    const note = new NoteModel({
      ...data,
      userId,
    });
    return await note.save();
  }

  async update(id: string, data: NoteUpdate, userId: string): Promise<NoteDocument> {
    const note = await NoteModel.findById(id);
    if (!note) throw new NotFoundError('Note not found');

    // Check ownership
    if (note.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const updatedNote = await NoteModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedNote) throw new NotFoundError('Note not found');
    return updatedNote;
  }

  async delete(id: string, userId: string): Promise<void> {
    const note = await NoteModel.findById(id);
    if (!note) throw new NotFoundError('Note not found');

    // Check ownership
    if (note.userId.toString() !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await NoteModel.findByIdAndDelete(id);
  }
}