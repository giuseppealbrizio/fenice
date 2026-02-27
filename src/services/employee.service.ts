import { EmployeeModel, type EmployeeDocument } from '../models/employee.model.js';
import type { EmployeeCreate, EmployeeUpdate } from '../schemas/employee.schema.js';
import type { PaginatedResponse } from '../schemas/common.schema.js';
import { decodeCursor, encodeCursor } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';

export class EmployeeService {
  async findAll(
    userId: string,
    filter: Record<string, unknown>,
    options: {
      cursor?: string | undefined;
      limit?: number | undefined;
      sort?: string | undefined;
      order?: 'asc' | 'desc' | undefined;
    }
  ): Promise<PaginatedResponse<EmployeeDocument>> {
    const { cursor, limit = 20, sort = 'createdAt', order = 'desc' } = options;
    const cursorData = decodeCursor(cursor);

    const query: Record<string, unknown> = { userId, ...filter };

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

    const employees = await EmployeeModel.find(query)
      .sort(sortObj)
      .limit(limit + 1);

    const hasNext = employees.length > limit;
    if (hasNext) employees.pop();

    const lastEmployee = employees[employees.length - 1];
    const nextCursor =
      hasNext && lastEmployee
        ? encodeCursor({
            id: lastEmployee._id.toString(),
            sortValue: String(lastEmployee.get(sort)),
          })
        : null;

    return {
      data: employees,
      pagination: { hasNext, nextCursor },
    };
  }

  async findById(userId: string, id: string): Promise<EmployeeDocument> {
    const employee = await EmployeeModel.findOne({ _id: id, userId });
    if (!employee) throw new NotFoundError('Employee not found');
    return employee;
  }

  async create(userId: string, data: EmployeeCreate): Promise<EmployeeDocument> {
    const employee = new EmployeeModel({ ...data, userId });
    await employee.save();
    return employee;
  }

  async update(userId: string, id: string, data: EmployeeUpdate): Promise<EmployeeDocument> {
    const employee = await EmployeeModel.findOneAndUpdate(
      { _id: id, userId },
      data,
      { new: true, runValidators: true }
    );
    if (!employee) throw new NotFoundError('Employee not found');
    return employee;
  }

  async delete(userId: string, id: string): Promise<void> {
    const employee = await EmployeeModel.findOneAndDelete({ _id: id, userId });
    if (!employee) throw new NotFoundError('Employee not found');
  }
}
