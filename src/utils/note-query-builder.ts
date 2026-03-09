interface NoteFilterParams {
  search?: string | undefined;
  tags?: string | undefined;
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildNoteFilter(params: NoteFilterParams, userId: string): Record<string, unknown> {
  const filter: Record<string, unknown> = { userId };

  if (params.search) {
    const escapedSearch = escapeRegex(params.search);
    const regex = new RegExp(escapedSearch, 'i');
    filter['$or'] = [
      { title: { $regex: regex } },
      { content: { $regex: regex } },
    ];
  }

  if (params.tags) {
    const tagList = params.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagList.length > 0) {
      filter['tags'] = { $in: tagList };
    }
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
