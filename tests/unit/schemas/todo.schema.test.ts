import { describe, it, expect } from 'vitest';
import { TodoSchema, TodoCreateSchema, TodoUpdateSchema } from '../../../src/schemas/todo.schema.js';

describe('TodoSchema', () => {
  it('should validate a correct todo object', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Complete project',
      description: 'Finish the todo app implementation',
      status: 'pending',
      priority: 'high',
      dueDate: new Date().toISOString(),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).not.toThrow();
  });

  it('should validate todo with minimal required fields', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Buy groceries',
      status: 'pending',
      priority: 'medium',
      completed: false,
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
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).toThrow();
  });

  it('should reject invalid status', () => {
    const todo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test todo',
      status: 'invalid-status',
      priority: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TodoSchema.parse(todo)).toThrow();
  });
});

describe('TodoCreateSchema', () => {
  it('should validate create input with all fields', () => {
    const input = {
      title: 'New todo item',
      description: 'This is a test todo',
      status: 'pending',
      priority: 'high',
      dueDate: new Date().toISOString(),
    };
    expect(() => TodoCreateSchema.parse(input)).not.toThrow();
  });

  it('should validate create input with minimal fields', () => {
    const input = {
      title: 'Minimal todo',
    };
    expect(() => TodoCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject title that is too long', () => {
    const input = {
      title: 'x'.repeat(201), // Too long
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });

  it('should reject invalid priority', () => {
    const input = {
      title: 'Test todo',
      priority: 'urgent', // Not in enum
    };
    expect(() => TodoCreateSchema.parse(input)).toThrow();
  });
});

describe('TodoUpdateSchema', () => {
  it('should validate partial update', () => {
    const input = {
      title: 'Updated title',
      completed: true,
    };
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate single field update', () => {
    const input = {
      status: 'completed',
    };
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject extra fields due to strict mode', () => {
    const input = {
      title: 'Updated title',
      extraField: 'not allowed',
    };
    expect(() => TodoUpdateSchema.parse(input)).toThrow();
  });

  it('should validate empty update object', () => {
    const input = {};
    expect(() => TodoUpdateSchema.parse(input)).not.toThrow();
  });
});
