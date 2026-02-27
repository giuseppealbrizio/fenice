interface UserFilterParams {
  search?: string | undefined;
  role?: string | undefined;
  active?: boolean | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

export function buildUserFilter(params: UserFilterParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.search) {
    const regex = new RegExp(params.search, 'i');
    filter['$or'] = [
      { email: { $regex: regex } },
      { username: { $regex: regex } },
      { fullName: { $regex: regex } },
    ];
  }

  if (params.role) {
    filter['role'] = params.role;
  }

  if (params.active !== undefined) {
    filter['active'] = params.active;
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

interface NoteFilterParams {
  search?: string | undefined;
  isPinned?: boolean | undefined;
  tags?: string | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

export function buildNoteFilter(params: NoteFilterParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.search) {
    const regex = new RegExp(params.search, 'i');
    filter['$or'] = [
      { title: { $regex: regex } },
      { content: { $regex: regex } },
    ];
  }

  if (params.isPinned !== undefined) {
    filter['isPinned'] = params.isPinned;
  }

  if (params.tags) {
    filter['tags'] = { $in: [params.tags] };
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