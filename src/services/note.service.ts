import { NoteModel, type NoteDocument } from '../models/note.model.js';
import type { NoteCreate, NoteUpdate, NoteQuery } from '../schemas/note.schema.js';
import type { PaginatedResponse } from '../schemas/common.schema.js';
import { decodeCursor, encodeCursor } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';

export class NoteService {
  async findAll(
    userId: string,
    query: NoteQuery,
    options: {
      cursor?: string | undefined;
      limit?: number | undefined;
      sort?: string | undefined;
      order?: 'asc' | 'desc' | undefined;
    }
  ): Promise<PaginatedResponse<NoteDocument>> {
    const { cursor, limit = 20, sort = 'createdAt', order = 'desc' } = options;
    const cursorData = decodeCursor(cursor);

    const filter: Record<string, unknown> = { userId };

    // Apply query filters
    if (query.search) {
      filter['$text'] = { $search: query.search };
    }

    if (query.tags) {
      const tagsArray = query.tags.split(',').map((tag) => tag.trim());
      filter['tags'] = { $in: tagsArray };
    }

    if (query.archived !== undefined) {
      filter['archived'] = query.archived;
    }

    if (query.createdAfter || query.createdBefore) {
      const dateFilter: Record<string, unknown> = {};
      if (query.createdAfter) dateFilter['$gte'] = new Date(query.createdAfter);
      if (query.createdBefore) dateFilter['$lte'] = new Date(query.createdBefore);
      filter['createdAt'] = dateFilter;
    }

    // Apply cursor pagination
    if (cursorData) {
      const direction = order === 'desc' ? '$lt' : '$gt';
      filter['$or'] = [
        { [sort]: { [direction]: cursorData.sortValue } },
        { [sort]: cursorData.sortValue, _id: { [direction]: cursorData.id } },
      ];
    }

    const sortObj: Record<string, 1 | -1> = {
      [sort]: order === 'desc' ? -1 : 1,
      _id: order === 'desc' ? -1 : 1,
    };

    const notes = await NoteModel.find(filter)
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

  async findById(id: string, userId: string): Promise<NoteDocument> {
    const note = await NoteModel.findOne({ _id: id, userId });
    if (!note) throw new NotFoundError('Note not found');
    return note;
  }

  async create(userId: string, data: NoteCreate): Promise<NoteDocument> {
    const note = new NoteModel({
      ...data,
      userId,
    });
    return await note.save();
  }

  async update(id: string, userId: string, data: NoteUpdate): Promise<NoteDocument> {
    const note = await NoteModel.findOneAndUpdate(
      { _id: id, userId },
      data,
      { new: true, runValidators: true }
    );
    if (!note) throw new NotFoundError('Note not found');
    return note;
  }

  async delete(id: string, userId: string): Promise<void> {
    const note = await NoteModel.findOneAndDelete({ _id: id, userId });
    if (!note) throw new NotFoundError('Note not found');
  }
}