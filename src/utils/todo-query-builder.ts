interface TodoFilterParams {
  search?: string | undefined;
  completed?: boolean | undefined;
  priority?: string | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTodoFilter(params: TodoFilterParams, userId: string): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    userId,
  };

  if (params.search && params.search.trim()) {
    const regex = new RegExp(escapeRegex(params.search), 'i');
    filter['$or'] = [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
    ];
  }

  if (params.completed !== undefined) {
    filter['completed'] = params.completed;
  }

  if (params.priority) {
    filter['priority'] = params.priority;
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
