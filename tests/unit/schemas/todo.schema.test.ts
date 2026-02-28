import { describe, it, expect } from 'vitest';
import { TodoSchema, TodoCreateSchema, TodoUpdateSchema } from '../../../src/schemas/todo.schema.js';

describe('TodoSchema', () => {
  it('should validate a correct todo object', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Complete project',
      description: 'Finish the TODO API implementation',
      status: 'pending',
      priority: 'high',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).not.toThrow();
  });

  it('should validate minimal todo object', () => {
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

  it('should reject invalid status', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test task',
      status: 'invalid-status',
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
      status: 'pending',
      priority: 'invalid-priority',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).toThrow();
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

  it('should validate minimal create input', () => {
    const input = {
      title: 'Minimal task',
    };
    expect(() => TodoCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject empty title', () => {
    const input = {
      title: '',
      description: 'Task description',
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });

  it('should reject title too long', () => {
    const input = {
      title: 'a'.repeat(201), // Exceeds 200 char limit
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });
});

describe('TodoUpdateSchema', () => {
  it('should validate partial update', () => {
    const input = {
      title: 'Updated task',
      status: 'inProgress',
    };
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate status change to completed with completedAt', () => {
    const input = {
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject invalid status', () => {
    const input = {
      status: 'invalid-status',
    };
    expect(() => TodoUpdateSchema.parse(input)).toThrow();
  });

  it('should reject extra fields (strict mode)', () => {
    const input = {
      title: 'Updated task',
      extraField: 'not allowed',
    };
    expect(() => TodoUpdateSchema.parse(input)).toThrow();
  });
});
