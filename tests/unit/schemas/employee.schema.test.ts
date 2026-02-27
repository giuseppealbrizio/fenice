import { describe, it, expect } from 'vitest';
import {
  EmployeeSchema,
  EmployeeCreateSchema,
  EmployeeUpdateSchema,
  EmployeeQuerySchema,
} from '../../../src/schemas/employee.schema.js';

describe('EmployeeSchema', () => {
  it('should validate a correct employee object', () => {
    const employee = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      department: 'engineering',
      position: 'Software Engineer',
      salary: 75000,
      hireDate: new Date().toISOString(),
      employmentStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => EmployeeSchema.parse(employee)).not.toThrow();
  });

  it('should reject invalid email', () => {
    const employee = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'not-an-email',
      department: 'engineering',
      position: 'Software Engineer',
      salary: 75000,
      hireDate: new Date().toISOString(),
      employmentStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => EmployeeSchema.parse(employee)).toThrow();
  });

  it('should reject invalid department', () => {
    const employee = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      department: 'invalid-department',
      position: 'Software Engineer',
      salary: 75000,
      hireDate: new Date().toISOString(),
      employmentStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => EmployeeSchema.parse(employee)).toThrow();
  });

  it('should reject negative salary', () => {
    const employee = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      department: 'engineering',
      position: 'Software Engineer',
      salary: -1000,
      hireDate: new Date().toISOString(),
      employmentStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => EmployeeSchema.parse(employee)).toThrow();
  });
});

describe('EmployeeCreateSchema', () => {
  it('should validate employee creation input', () => {
    const input = {
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      department: 'engineering',
      position: 'Software Engineer',
      salary: 75000,
      hireDate: new Date().toISOString(),
    };
    expect(() => EmployeeCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject missing required fields', () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      // Missing employeeId, department, position, salary, hireDate
    };
    expect(() => EmployeeCreateSchema.parse(input)).toThrow();
  });

  it('should accept optional fields', () => {
    const input = {
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      department: 'engineering',
      position: 'Software Engineer',
      salary: 75000,
      hireDate: new Date().toISOString(),
      phoneNumber: '+1234567890',
      address: '123 Main St',
      emergencyContact: 'Jane Doe',
      emergencyPhone: '+0987654321',
    };
    expect(() => EmployeeCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject too short firstName', () => {
    const input = {
      employeeId: 'EMP001',
      firstName: '',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      department: 'engineering',
      position: 'Software Engineer',
      salary: 75000,
      hireDate: new Date().toISOString(),
    };
    expect(() => EmployeeCreateSchema.parse(input)).toThrow();
  });
});

describe('EmployeeUpdateSchema', () => {
  it('should validate partial employee updates', () => {
    const updates = {
      firstName: 'Jane',
      salary: 80000,
      employmentStatus: 'active',
    };
    expect(() => EmployeeUpdateSchema.parse(updates)).not.toThrow();
  });

  it('should validate empty updates', () => {
    const updates = {};
    expect(() => EmployeeUpdateSchema.parse(updates)).not.toThrow();
  });

  it('should reject unknown fields', () => {
    const updates = {
      firstName: 'Jane',
      unknownField: 'value',
    };
    expect(() => EmployeeUpdateSchema.parse(updates)).toThrow();
  });

  it('should reject invalid email in update', () => {
    const updates = {
      email: 'not-an-email',
    };
    expect(() => EmployeeUpdateSchema.parse(updates)).toThrow();
  });

  it('should reject negative salary in update', () => {
    const updates = {
      salary: -5000,
    };
    expect(() => EmployeeUpdateSchema.parse(updates)).toThrow();
  });
});

describe('EmployeeQuerySchema', () => {
  it('should validate empty query params', () => {
    const query = {};
    expect(() => EmployeeQuerySchema.parse(query)).not.toThrow();
  });

  it('should validate search query', () => {
    const query = {
      search: 'John',
      department: 'engineering',
      employmentStatus: 'active',
    };
    expect(() => EmployeeQuerySchema.parse(query)).not.toThrow();
  });

  it('should validate salary range queries', () => {
    const query = {
      salaryMin: 50000,
      salaryMax: 100000,
    };
    expect(() => EmployeeQuerySchema.parse(query)).not.toThrow();
  });

  it('should validate date range queries', () => {
    const query = {
      hiredAfter: new Date('2023-01-01').toISOString(),
      hiredBefore: new Date('2023-12-31').toISOString(),
    };
    expect(() => EmployeeQuerySchema.parse(query)).not.toThrow();
  });

  it('should reject invalid department in query', () => {
    const query = {
      department: 'invalid-department',
    };
    expect(() => EmployeeQuerySchema.parse(query)).toThrow();
  });

  it('should reject negative salary in query', () => {
    const query = {
      salaryMin: -1000,
    };
    expect(() => EmployeeQuerySchema.parse(query)).toThrow();
  });
});
