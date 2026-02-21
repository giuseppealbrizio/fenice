import type { FilterQuery } from 'mongoose';

interface UserFilterParams {
  search?: string;
  role?: string;
  active?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

export function buildUserFilter(params: UserFilterParams): FilterQuery<unknown> {
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

  return filter as FilterQuery<unknown>;
}
