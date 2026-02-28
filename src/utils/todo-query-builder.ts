import mongoose from 'mongoose';

interface TodoFilterParams {
  search?: string | undefined;
  status?: string | undefined;
  priority?: string | undefined;
  completed?: boolean | undefined;
  dueBefore?: string | undefined;
  dueAfter?: string | undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTodoFilter(params: TodoFilterParams, userId: string): Record<string, unknown> {
  const filter: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };

  if (params.search) {
    const regex = new RegExp(escapeRegex(params.search), 'i');
    filter['$or'] = [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
    ];
  }

  if (params.status) {
    filter['status'] = params.status;
  }

  if (params.priority) {
    filter['priority'] = params.priority;
  }

  if (params.completed !== undefined) {
    filter['completed'] = params.completed;
  }

  if (params.dueBefore || params.dueAfter) {
    const dateFilter: Record<string, Date> = {};
    if (params.dueBefore) {
      dateFilter['$lte'] = new Date(params.dueBefore);
    }
    if (params.dueAfter) {
      dateFilter['$gte'] = new Date(params.dueAfter);
    }
    filter['dueDate'] = dateFilter;
  }

  return filter;
}
