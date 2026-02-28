import { TodoModel, type TodoDocument } from '../models/todo.model.js';
import type { TodoCreate, TodoUpdate } from '../schemas/todo.schema.js';
import type { PaginatedResponse } from '../schemas/common.schema.js';
import { decodeCursor, encodeCursor } from '../utils/pagination.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class TodoService {
  async findAll(
    filter: Record<string, unknown>,
    options: {
      cursor?: string | undefined;
      limit?: number | undefined;
      sort?: string | undefined;
      order?: 'asc' | 'desc' | undefined;
    }
  ): Promise<PaginatedResponse<TodoDocument>> {
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

    const todos = await TodoModel.find(query)
      .sort(sortObj)
      .limit(limit + 1);

    const hasNext = todos.length > limit;
    if (hasNext) todos.pop();

    const lastTodo = todos[todos.length - 1];
    const nextCursor =
      hasNext && lastTodo
        ? encodeCursor({
            id: lastTodo._id.toString(),
            sortValue: String(lastTodo.get(sort)),
          })
        : null;

    return {
      data: todos,
      pagination: { hasNext, nextCursor },
    };
  }

  async findById(id: string, userId: string): Promise<TodoDocument> {
    const todo = await TodoModel.findOne({ _id: id, userId });
    if (!todo) throw new NotFoundError('Todo not found');
    return todo;
  }

  async create(data: TodoCreate, userId: string): Promise<TodoDocument> {
    const todo = new TodoModel({
      ...data,
      userId,
    });
    return await todo.save();
  }

  async update(id: string, data: TodoUpdate, userId: string, userRole?: string): Promise<TodoDocument> {
    const todo = await TodoModel.findById(id);
    if (!todo) throw new NotFoundError('Todo not found');
    
    if (todo.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    Object.assign(todo, data);
    return await todo.save();
  }

  async delete(id: string, userId: string, userRole?: string): Promise<void> {
    const todo = await TodoModel.findById(id);
    if (!todo) throw new NotFoundError('Todo not found');
    
    if (todo.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    await TodoModel.findByIdAndDelete(id);
  }
}
