interface TodoFilterParams {
  search?: string | undefined;
  status?: string | undefined;
  priority?: string | undefined;
  dueBefore?: string | undefined;
  dueAfter?: string | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTodoFilter(params: TodoFilterParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.search && params.search.trim() !== '') {
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

  if (params.dueAfter || params.dueBefore) {
    const dateFilter: Record<string, Date> = {};
    if (params.dueAfter) {
      dateFilter['$gte'] = new Date(params.dueAfter);
    }
    if (params.dueBefore) {
      dateFilter['$lte'] = new Date(params.dueBefore);
    }
    filter['dueDate'] = dateFilter;
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
