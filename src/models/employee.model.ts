import mongoose, { Schema, type Document } from 'mongoose';
import type { Employee } from '../schemas/employee.schema.js';
import { EmploymentStatusEnum, DepartmentEnum } from '../schemas/employee.schema.js';

export interface EmployeeDocument extends Omit<Employee, 'id'>, Document {}

const employeeSchema = new Schema<EmployeeDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 20,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      enum: DepartmentEnum.options,
      required: true,
      index: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    salary: {
      type: Number,
      required: true,
      min: 0,
    },
    hireDate: {
      type: String,
      required: true,
    },
    employmentStatus: {
      type: String,
      enum: EmploymentStatusEnum.options,
      default: 'active',
      index: true,
    },
    manager: {
      type: String,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    emergencyPhone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        ret['id'] = String(ret['_id']);
        delete ret['_id'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

employeeSchema.index({ userId: 1, employeeId: 1 });
employeeSchema.index({ userId: 1, department: 1 });
employeeSchema.index({ userId: 1, employmentStatus: 1 });

export const EmployeeModel = mongoose.model<EmployeeDocument>('Employee', employeeSchema);
