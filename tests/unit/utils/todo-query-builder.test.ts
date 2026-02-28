import { describe, it, expect } from 'vitest';
import { buildTodoFilter } from '../../../src/utils/todo-query-builder.js';

describe('buildTodoFilter', () => {
  it('should return empty filter for empty params', () => {
    const filter = buildTodoFilter({});
    expect(filter).toEqual({});
  });

  it('should build search filter', () => {
    const filter = buildTodoFilter({ search: 'test task' });
    expect(filter).toHaveProperty('$or');
    expect(filter['$or']).toHaveLength(2);
    // Check that regex is properly escaped and case-insensitive
    const orConditions = filter['$or'] as Record<string, unknown>[];
    expect(orConditions[0]).toHaveProperty('title');
    expect(orConditions[1]).toHaveProperty('description');
  });

  it('should escape regex special characters', () => {
    const filter = buildTodoFilter({ search: '.*+?^${}()|[]\\' });
    const orConditions = filter['$or'] as { title: { $regex: RegExp } }[];
    const regex = orConditions[0]['title']['$regex'];
    expect(regex.source).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('should build status filter', () => {
    const filter = buildTodoFilter({ status: 'completed' });
    expect(filter).toEqual({ status: 'completed' });
  });

  it('should build priority filter', () => {
    const filter = buildTodoFilter({ priority: 'high' });
    expect(filter).toEqual({ priority: 'high' });
  });

  it('should build due date range filter', () => {
    const dueAfter = '2023-01-01T00:00:00.000Z';
    const dueBefore = '2023-12-31T23:59:59.999Z';
    const filter = buildTodoFilter({ dueAfter, dueBefore });
    
    expect(filter).toHaveProperty('dueDate');
    const dueDateFilter = filter['dueDate'] as Record<string, Date>;
    expect(dueDateFilter['$gte']).toEqual(new Date(dueAfter));
    expect(dueDateFilter['$lte']).toEqual(new Date(dueBefore));
  });

  it('should build created date range filter', () => {
    const createdAfter = '2023-01-01T00:00:00.000Z';
    const createdBefore = '2023-12-31T23:59:59.999Z';
    const filter = buildTodoFilter({ createdAfter, createdBefore });
    
    expect(filter).toHaveProperty('createdAt');
    const createdAtFilter = filter['createdAt'] as Record<string, Date>;
    expect(createdAtFilter['$gte']).toEqual(new Date(createdAfter));
    expect(createdAtFilter['$lte']).toEqual(new Date(createdBefore));
  });

  it('should build filter with only dueAfter', () => {
    const dueAfter = '2023-06-01T00:00:00.000Z';
    const filter = buildTodoFilter({ dueAfter });
    
    expect(filter).toHaveProperty('dueDate');
    const dueDateFilter = filter['dueDate'] as Record<string, Date>;
    expect(dueDateFilter['$gte']).toEqual(new Date(dueAfter));
    expect(dueDateFilter).not.toHaveProperty('$lte');
  });

  it('should build filter with only dueBefore', () => {
    const dueBefore = '2023-06-30T23:59:59.999Z';
    const filter = buildTodoFilter({ dueBefore });
    
    expect(filter).toHaveProperty('dueDate');
    const dueDateFilter = filter['dueDate'] as Record<string, Date>;
    expect(dueDateFilter['$lte']).toEqual(new Date(dueBefore));
    expect(dueDateFilter).not.toHaveProperty('$gte');
  });

  it('should combine multiple filters', () => {
    const filter = buildTodoFilter({
      search: 'urgent',
      status: 'pending',
      priority: 'high',
      dueAfter: '2023-01-01T00:00:00.000Z',
    });

    expect(filter).toHaveProperty('$or');
    expect(filter).toHaveProperty('status', 'pending');
    expect(filter).toHaveProperty('priority', 'high');
    expect(filter).toHaveProperty('dueDate');
  });

  it('should handle empty string search', () => {
    const filter = buildTodoFilter({ search: '' });
    expect(filter).toEqual({});
  });

  it('should handle undefined values', () => {
    const filter = buildTodoFilter({
      search: undefined,
      status: undefined,
      priority: undefined,
      dueAfter: undefined,
      dueBefore: undefined,
    });
    expect(filter).toEqual({});
  });
});
