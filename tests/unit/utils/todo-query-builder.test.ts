import { describe, it, expect } from 'vitest';
import { buildTodoFilter } from '../../../src/utils/todo-query-builder.js';

describe('buildTodoFilter', () => {
  const userId = '507f1f77bcf86cd799439011';

  it('should return basic filter with userId', () => {
    const result = buildTodoFilter({}, userId);
    expect(result).toEqual({
      userId,
    });
  });

  it('should add search filter for title and description', () => {
    const result = buildTodoFilter({ search: 'groceries' }, userId);
    expect(result.userId).toBe(userId);
    expect(result['$or']).toHaveLength(2);
    expect(result['$or']).toEqual([
      { title: { $regex: /groceries/i } },
      { description: { $regex: /groceries/i } },
    ]);
  });

  it('should escape special regex characters in search', () => {
    const result = buildTodoFilter({ search: 'test.+*?' }, userId);
    expect(result['$or']).toEqual([
      { title: { $regex: /test\.\+\*\?/i } },
      { description: { $regex: /test\.\+\*\?/i } },
    ]);
  });

  it('should add completed filter', () => {
    const result = buildTodoFilter({ completed: true }, userId);
    expect(result).toEqual({
      userId,
      completed: true,
    });
  });

  it('should add priority filter', () => {
    const result = buildTodoFilter({ priority: 'high' }, userId);
    expect(result).toEqual({
      userId,
      priority: 'high',
    });
  });

  it('should add date range filters', () => {
    const createdAfter = '2023-01-01T00:00:00.000Z';
    const createdBefore = '2023-12-31T23:59:59.999Z';
    const result = buildTodoFilter({ createdAfter, createdBefore }, userId);
    
    expect(result.userId).toBe(userId);
    expect(result.createdAt).toEqual({
      $gte: new Date(createdAfter),
      $lte: new Date(createdBefore),
    });
  });

  it('should add only createdAfter filter', () => {
    const createdAfter = '2023-01-01T00:00:00.000Z';
    const result = buildTodoFilter({ createdAfter }, userId);
    
    expect(result.createdAt).toEqual({
      $gte: new Date(createdAfter),
    });
  });

  it('should add only createdBefore filter', () => {
    const createdBefore = '2023-12-31T23:59:59.999Z';
    const result = buildTodoFilter({ createdBefore }, userId);
    
    expect(result.createdAt).toEqual({
      $lte: new Date(createdBefore),
    });
  });

  it('should combine all filters', () => {
    const params = {
      search: 'work',
      completed: false,
      priority: 'high',
      createdAfter: '2023-01-01T00:00:00.000Z',
      createdBefore: '2023-12-31T23:59:59.999Z',
    };
    const result = buildTodoFilter(params, userId);
    
    expect(result.userId).toBe(userId);
    expect(result.completed).toBe(false);
    expect(result.priority).toBe('high');
    expect(result['$or']).toHaveLength(2);
    expect(result.createdAt).toEqual({
      $gte: new Date(params.createdAfter),
      $lte: new Date(params.createdBefore),
    });
  });

  it('should handle empty search string', () => {
    const result = buildTodoFilter({ search: '' }, userId);
    expect(result).toEqual({
      userId,
    });
  });

  it('should handle undefined values', () => {
    const result = buildTodoFilter(
      {
        search: undefined,
        completed: undefined,
        priority: undefined,
        createdAfter: undefined,
        createdBefore: undefined,
      },
      userId
    );
    expect(result).toEqual({
      userId,
    });
  });
});
