import { describe, it, expect } from 'vitest';
import { TodoSchema, TodoCreateSchema, TodoUpdateSchema } from '../../../src/schemas/todo.schema.js';

describe('TodoSchema', () => {
  it('should validate a correct todo object', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Buy groceries',
      description: 'Buy milk, bread, and eggs',
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).not.toThrow();
  });

  it('should validate a minimal todo object', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Simple task',
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).not.toThrow();
  });

  it('should reject empty title', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: '',
      completed: false,
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).toThrow();
  });

  it('should reject invalid priority', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test task',
      completed: false,
      priority: 'invalid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).toThrow();
  });
});

describe('TodoCreateSchema', () => {
  it('should validate todo creation input', () => {
    const input = {
      title: 'New task',
      description: 'This is a new task',
      priority: 'high',
    };
    expect(() => TodoCreateSchema.parse(input)).not.toThrow();
  });

  it('should validate minimal creation input', () => {
    const input = {
      title: 'Minimal task',
    };
    expect(() => TodoCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject empty title in creation', () => {
    const input = {
      title: '',
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });

  it('should reject too long title', () => {
    const input = {
      title: 'x'.repeat(201),
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });
});

describe('TodoUpdateSchema', () => {
  it('should validate todo update input', () => {
    const input = {
      title: 'Updated task',
      completed: true,
      priority: 'low',
    };
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate partial update', () => {
    const input = {
      completed: true,
    };
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate empty update object', () => {
    const input = {};
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject unknown fields due to strict mode', () => {
    const input = {
      title: 'Updated task',
      unknownField: 'value',
    };
    expect(() => TodoUpdateSchema.parse(input)).toThrow();
  });
});
