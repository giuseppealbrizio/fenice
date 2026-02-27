interface UserFilterParams {
  search?: string | undefined;
  role?: string | undefined;
  active?: boolean | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

interface NoteFilterParams {
  search?: string | undefined;
  isPinned?: boolean | undefined;
  tags?: string | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildUserFilter(params: UserFilterParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.search) {
    const regex = new RegExp(escapeRegex(params.search), 'i');
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

export function buildNoteFilter(params: NoteFilterParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.search) {
    const regex = new RegExp(escapeRegex(params.search), 'i');
    filter['$or'] = [
      { title: { $regex: regex } },
      { content: { $regex: regex } },
    ];
  }

  if (params.isPinned !== undefined) {
    filter['isPinned'] = params.isPinned;
  }

  if (params.tags) {
    const tagArray = params.tags.split(',').map(tag => tag.trim());
    filter['tags'] = { $in: tagArray };
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
