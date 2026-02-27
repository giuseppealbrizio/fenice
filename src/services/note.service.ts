import { NoteModel, type NoteDocument } from '../models/note.model.js';
import type { NoteCreate, NoteUpdate } from '../schemas/note.schema.js';
import type { PaginatedResponse } from '../schemas/common.schema.js';
import { decodeCursor, encodeCursor } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';

export class NoteService {
  async findAll(
    userId: string,
    filter: Record<string, unknown>,
    options: {
      cursor?: string | undefined;
      limit?: number | undefined;
      sort?: string | undefined;
      order?: 'asc' | 'desc' | undefined;
    }
  ): Promise<PaginatedResponse<NoteDocument>> {
    const { cursor, limit = 20, sort = 'createdAt', order = 'desc' } = options;
    const cursorData = decodeCursor(cursor);

    const query: Record<string, unknown> = { ...filter, userId };

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

  async findById(id: string, userId: string): Promise<NoteDocument> {
    const note = await NoteModel.findOne({ _id: id, userId });
    if (!note) throw new NotFoundError('Note not found');
    return note;
  }

  async create(data: NoteCreate, userId: string): Promise<NoteDocument> {
    const note = new NoteModel({ ...data, userId });
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