import mongoose from 'mongoose';
import { describe, it, expect } from 'vitest';
import { buildTodoFilter } from '../../../src/utils/todo-query-builder.js';

describe('buildTodoFilter', () => {
  const userId = '550e8400e29b41d4a716446655440000';

  it('should always include userId in filter', () => {
    const filter = buildTodoFilter({}, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter.userId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(filter.userId.toString()).toBe(userId);
  });

  it('should handle search parameter', () => {
    const filter = buildTodoFilter({ search: 'test' }, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter).toHaveProperty('$or');
    const orCondition = filter['$or'] as Record<string, unknown>[];
    expect(orCondition).toHaveLength(2);
    expect(orCondition[0]).toHaveProperty('title');
    expect(orCondition[1]).toHaveProperty('description');
  });

  it('should escape regex special characters in search', () => {
    const filter = buildTodoFilter({ search: 'test.+*?^${}()|[]\\' }, userId);
    const orCondition = filter['$or'] as Record<string, unknown>[];
    const titleRegex = orCondition[0]['title'] as { $regex: RegExp };
    expect(titleRegex.$regex.source).toBe('test\\.\\+\\*\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('should handle status filter', () => {
    const filter = buildTodoFilter({ status: 'completed' }, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter).toHaveProperty('status', 'completed');
  });

  it('should handle priority filter', () => {
    const filter = buildTodoFilter({ priority: 'high' }, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter).toHaveProperty('priority', 'high');
  });

  it('should handle completed filter', () => {
    const filter = buildTodoFilter({ completed: true }, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter).toHaveProperty('completed', true);
  });

  it('should handle completed false filter', () => {
    const filter = buildTodoFilter({ completed: false }, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter).toHaveProperty('completed', false);
  });

  it('should handle due date range filters', () => {
    const dueBefore = '2024-01-15T12:00:00.000Z';
    const dueAfter = '2024-01-01T00:00:00.000Z';
    
    const filter = buildTodoFilter({ dueBefore, dueAfter }, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter).toHaveProperty('dueDate');
    
    const dateFilter = filter['dueDate'] as Record<string, Date>;
    expect(dateFilter).toHaveProperty('$lte');
    expect(dateFilter).toHaveProperty('$gte');
    expect(dateFilter['$lte']).toEqual(new Date(dueBefore));
    expect(dateFilter['$gte']).toEqual(new Date(dueAfter));
  });

  it('should handle only dueBefore filter', () => {
    const dueBefore = '2024-01-15T12:00:00.000Z';
    const filter = buildTodoFilter({ dueBefore }, userId);
    
    const dateFilter = filter['dueDate'] as Record<string, Date>;
    expect(dateFilter).toEqual({ $lte: new Date(dueBefore) });
  });

  it('should handle only dueAfter filter', () => {
    const dueAfter = '2024-01-01T00:00:00.000Z';
    const filter = buildTodoFilter({ dueAfter }, userId);
    
    const dateFilter = filter['dueDate'] as Record<string, Date>;
    expect(dateFilter).toEqual({ $gte: new Date(dueAfter) });
  });

  it('should handle combined filters', () => {
    const params = {
      search: 'project',
      status: 'in-progress',
      priority: 'high',
      completed: false,
      dueBefore: '2024-12-31T23:59:59.000Z',
    };
    
    const filter = buildTodoFilter(params, userId);
    expect(filter).toHaveProperty('userId');
    expect(filter).toHaveProperty('$or');
    expect(filter).toHaveProperty('status', 'in-progress');
    expect(filter).toHaveProperty('priority', 'high');
    expect(filter).toHaveProperty('completed', false);
    expect(filter).toHaveProperty('dueDate');
  });

  it('should handle empty search string', () => {
    const filter = buildTodoFilter({ search: '' }, userId);
    // Empty search should not add $or condition
    expect(filter).not.toHaveProperty('$or');
    expect(filter).toHaveProperty('userId');
  });
});
