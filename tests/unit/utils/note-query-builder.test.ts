import { describe, it, expect } from 'vitest';
import { buildNoteFilter } from '../../../src/utils/note-query-builder.js';

describe('buildNoteFilter', () => {
  const userId = '507f1f77bcf86cd799439011';

  it('should always include userId in filter', () => {
    const result = buildNoteFilter({}, userId);
    expect(result).toEqual({ userId });
  });

  it('should build filter with search query', () => {
    const result = buildNoteFilter({ search: 'test query' }, userId);
    expect(result).toEqual({
      userId,
      $or: [
        { title: { $regex: /test query/i } },
        { content: { $regex: /test query/i } },
      ],
    });
  });

  it('should escape regex special characters in search', () => {
    const result = buildNoteFilter({ search: 'test.*+?^${}()|[]\\' }, userId);
    expect(result).toEqual({
      userId,
      $or: [
        { title: { $regex: /test\.\*\+\?\^\$\{\}\(\)\|\[\]\\/i } },
        { content: { $regex: /test\.\*\+\?\^\$\{\}\(\)\|\[\]\\/i } },
      ],
    });
  });

  it('should not add search filter for empty string', () => {
    const result = buildNoteFilter({ search: '' }, userId);
    expect(result).toEqual({ userId });
  });

  it('should build filter with single tag', () => {
    const result = buildNoteFilter({ tags: 'work' }, userId);
    expect(result).toEqual({
      userId,
      tags: { $in: ['work'] },
    });
  });

  it('should build filter with multiple tags', () => {
    const result = buildNoteFilter({ tags: 'work,important,personal' }, userId);
    expect(result).toEqual({
      userId,
      tags: { $in: ['work', 'important', 'personal'] },
    });
  });

  it('should trim whitespace from tags', () => {
    const result = buildNoteFilter({ tags: ' work , important , personal ' }, userId);
    expect(result).toEqual({
      userId,
      tags: { $in: ['work', 'important', 'personal'] },
    });
  });

  it('should filter out empty tags', () => {
    const result = buildNoteFilter({ tags: 'work,,important, ,personal' }, userId);
    expect(result).toEqual({
      userId,
      tags: { $in: ['work', 'important', 'personal'] },
    });
  });

  it('should not add tags filter for empty string', () => {
    const result = buildNoteFilter({ tags: '' }, userId);
    expect(result).toEqual({ userId });
  });

  it('should not add tags filter for whitespace only', () => {
    const result = buildNoteFilter({ tags: '  ,  ,  ' }, userId);
    expect(result).toEqual({ userId });
  });

  it('should build filter with createdAfter date', () => {
    const date = '2023-01-01T00:00:00.000Z';
    const result = buildNoteFilter({ createdAfter: date }, userId);
    expect(result).toEqual({
      userId,
      createdAt: { $gte: new Date(date) },
    });
  });

  it('should build filter with createdBefore date', () => {
    const date = '2023-12-31T23:59:59.999Z';
    const result = buildNoteFilter({ createdBefore: date }, userId);
    expect(result).toEqual({
      userId,
      createdAt: { $lte: new Date(date) },
    });
  });

  it('should build filter with date range', () => {
    const startDate = '2023-01-01T00:00:00.000Z';
    const endDate = '2023-12-31T23:59:59.999Z';
    const result = buildNoteFilter({ createdAfter: startDate, createdBefore: endDate }, userId);
    expect(result).toEqual({
      userId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });
  });

  it('should build filter with all parameters', () => {
    const result = buildNoteFilter(
      {
        search: 'test query',
        tags: 'work,important',
        createdAfter: '2023-01-01T00:00:00.000Z',
        createdBefore: '2023-12-31T23:59:59.999Z',
      },
      userId
    );
    expect(result).toEqual({
      userId,
      $or: [
        { title: { $regex: /test query/i } },
        { content: { $regex: /test query/i } },
      ],
      tags: { $in: ['work', 'important'] },
      createdAt: {
        $gte: new Date('2023-01-01T00:00:00.000Z'),
        $lte: new Date('2023-12-31T23:59:59.999Z'),
      },
    });
  });
});
