import { describe, it, expect } from 'vitest';
import { TodoSchema, TodoCreateSchema, TodoUpdateSchema } from '../../../src/schemas/todo.schema.js';

describe('TodoSchema', () => {
  it('should validate a correct todo object', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Complete project',
      description: 'Finish the todo app',
      status: 'pending',
      priority: 'high',
      dueDate: new Date().toISOString(),
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
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).toThrow();
  });

  it('should accept todo without description and dueDate', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Simple task',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).not.toThrow();
  });
});

describe('TodoCreateSchema', () => {
  it('should validate create input with all fields', () => {
    const input = {
      title: 'New task',
      description: 'Task description',
      priority: 'high',
      dueDate: new Date().toISOString(),
    };
    expect(() => TodoCreateSchema.parse(input)).not.toThrow();
  });

  it('should validate create input with only title', () => {
    const input = {
      title: 'Simple task',
    };
    expect(() => TodoCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject empty title', () => {
    const input = {
      title: '',
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });

  it('should reject title that is too long', () => {
    const input = {
      title: 'a'.repeat(201),
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });
});

describe('TodoUpdateSchema', () => {
  it('should validate update with partial fields', () => {
    const input = {
      title: 'Updated task',
      status: 'completed',
    };
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate empty update object', () => {
    const input = {};
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject unknown fields (strict mode)', () => {
    const input = {
      title: 'Updated task',
      unknownField: 'value',
    };
    expect(() => TodoUpdateSchema.parse(input)).toThrow();
  });
});
