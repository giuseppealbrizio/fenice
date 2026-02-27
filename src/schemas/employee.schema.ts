import { z } from 'zod';

export const EmploymentStatusEnum = z.enum(['active', 'inactive', 'terminated', 'onLeave']);

export const DepartmentEnum = z.enum([
  'engineering',
  'marketing',
  'sales',
  'hr',
  'finance',
  'operations',
  'legal',
  'design',
  'product',
  'support',
]);

export const EmployeeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  employeeId: z.string(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.email(),
  department: DepartmentEnum,
  position: z.string().min(1).max(100),
  salary: z.number().positive(),
  hireDate: z.iso.datetime(),
  employmentStatus: EmploymentStatusEnum.default('active'),
  manager: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const EmployeeCreateSchema = z.object({
  employeeId: z.string().min(1).max(20),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.email(),
  department: DepartmentEnum,
  position: z.string().min(1).max(100),
  salary: z.number().positive(),
  hireDate: z.iso.datetime(),
  manager: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export const EmployeeUpdateSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.email().optional(),
    department: DepartmentEnum.optional(),
    position: z.string().min(1).max(100).optional(),
    salary: z.number().positive().optional(),
    employmentStatus: EmploymentStatusEnum.optional(),
    manager: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
  })
  .strict();

export const EmployeeQuerySchema = z.object({
  search: z.string().optional(),
  department: DepartmentEnum.optional(),
  employmentStatus: EmploymentStatusEnum.optional(),
  position: z.string().optional(),
  manager: z.string().optional(),
  hiredAfter: z.iso.datetime().optional(),
  hiredBefore: z.iso.datetime().optional(),
  salaryMin: z.coerce.number().positive().optional(),
  salaryMax: z.coerce.number().positive().optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;
export type EmployeeCreate = z.infer<typeof EmployeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof EmployeeUpdateSchema>;
export type EmployeeQuery = z.infer<typeof EmployeeQuerySchema>;
