import { describe, it, expect } from 'vitest';
import { buildTodoFilter } from '../../../src/utils/todo-query-builder.js';

describe('buildTodoFilter', () => {
  it('should return empty filter for empty params', () => {
    const filter = buildTodoFilter({});
    expect(filter).toEqual({});
  });

  it('should build search filter with regex', () => {
    const filter = buildTodoFilter({ search: 'test task' });
    expect(filter).toHaveProperty('$or');
    const orConditions = filter['$or'] as Record<string, unknown>[];
    expect(orConditions).toHaveLength(2);
    expect(orConditions[0]).toHaveProperty('title');
    expect(orConditions[1]).toHaveProperty('description');
  });

  it('should escape regex special characters in search', () => {
    const filter = buildTodoFilter({ search: 'test.task*' });
    const orConditions = filter['$or'] as Record<string, unknown>[];
    const titleRegex = orConditions[0]['title'] as Record<string, RegExp>;
    expect(titleRegex['$regex'].source).toBe('test\\.task\\*');
  });

  it('should not create search filter for empty string', () => {
    const filter = buildTodoFilter({ search: '' });
    expect(filter).not.toHaveProperty('$or');
  });

  it('should not create search filter for whitespace-only string', () => {
    const filter = buildTodoFilter({ search: '   ' });
    expect(filter).not.toHaveProperty('$or');
  });

  it('should build status filter', () => {
    const filter = buildTodoFilter({ status: 'completed' });
    expect(filter).toEqual({ status: 'completed' });
  });

  it('should build priority filter', () => {
    const filter = buildTodoFilter({ priority: 'high' });
    expect(filter).toEqual({ priority: 'high' });
  });

  it('should build dueDate range filter', () => {
    const dueAfter = '2024-01-01T00:00:00.000Z';
    const dueBefore = '2024-01-31T23:59:59.999Z';
    const filter = buildTodoFilter({ dueAfter, dueBefore });
    
    expect(filter).toHaveProperty('dueDate');
    const dateFilter = filter['dueDate'] as Record<string, Date>;
    expect(dateFilter['$gte']).toEqual(new Date(dueAfter));
    expect(dateFilter['$lte']).toEqual(new Date(dueBefore));
  });

  it('should build createdAt range filter', () => {
    const createdAfter = '2024-01-01T00:00:00.000Z';
    const createdBefore = '2024-01-31T23:59:59.999Z';
    const filter = buildTodoFilter({ createdAfter, createdBefore });
    
    expect(filter).toHaveProperty('createdAt');
    const dateFilter = filter['createdAt'] as Record<string, Date>;
    expect(dateFilter['$gte']).toEqual(new Date(createdAfter));
    expect(dateFilter['$lte']).toEqual(new Date(createdBefore));
  });

  it('should build partial date range filters', () => {
    const filterAfter = buildTodoFilter({ dueAfter: '2024-01-01T00:00:00.000Z' });
    expect(filterAfter['dueDate']).toEqual({ $gte: new Date('2024-01-01T00:00:00.000Z') });

    const filterBefore = buildTodoFilter({ dueBefore: '2024-01-31T23:59:59.999Z' });
    expect(filterBefore['dueDate']).toEqual({ $lte: new Date('2024-01-31T23:59:59.999Z') });
  });

  it('should combine multiple filters', () => {
    const filter = buildTodoFilter({
      search: 'urgent',
      status: 'pending',
      priority: 'high',
      dueAfter: '2024-01-01T00:00:00.000Z',
    });

    expect(filter).toHaveProperty('$or');
    expect(filter).toHaveProperty('status', 'pending');
    expect(filter).toHaveProperty('priority', 'high');
    expect(filter).toHaveProperty('dueDate');
  });
});
