import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { EmployeeService } from '../services/employee.service.js';
import {
  EmployeeSchema,
  EmployeeCreateSchema,
  EmployeeUpdateSchema,
  EmployeeQuerySchema,
} from '../schemas/employee.schema.js';
import {
  CursorPaginationSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '../schemas/common.schema.js';
import type { Employee } from '../schemas/employee.schema.js';
import type { EmployeeDocument } from '../models/employee.model.js';
import { ForbiddenError } from '../utils/errors.js';

// Env type for routes that expect auth context
type AuthEnv = {
  Variables: {
    userId: string;
    email: string;
    role: string;
    requestId: string;
  };
};

const employeeService = new EmployeeService();

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildEmployeeFilter(params: {
  search?: string | undefined;
  department?: string | undefined;
  employmentStatus?: string | undefined;
  position?: string | undefined;
  manager?: string | undefined;
  hiredAfter?: string | undefined;
  hiredBefore?: string | undefined;
  salaryMin?: number | undefined;
  salaryMax?: number | undefined;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.search) {
    const regex = new RegExp(escapeRegex(params.search), 'i');
    filter['$or'] = [
      { firstName: { $regex: regex } },
      { lastName: { $regex: regex } },
      { email: { $regex: regex } },
      { employeeId: { $regex: regex } },
      { position: { $regex: regex } },
    ];
  }

  if (params.department) {
    filter['department'] = params.department;
  }

  if (params.employmentStatus) {
    filter['employmentStatus'] = params.employmentStatus;
  }

  if (params.position) {
    const regex = new RegExp(escapeRegex(params.position), 'i');
    filter['position'] = { $regex: regex };
  }

  if (params.manager) {
    filter['manager'] = params.manager;
  }

  if (params.hiredAfter || params.hiredBefore) {
    const dateFilter: Record<string, Date> = {};
    if (params.hiredAfter) {
      dateFilter['$gte'] = new Date(params.hiredAfter);
    }
    if (params.hiredBefore) {
      dateFilter['$lte'] = new Date(params.hiredBefore);
    }
    filter['hireDate'] = dateFilter;
  }

  if (params.salaryMin !== undefined || params.salaryMax !== undefined) {
    const salaryFilter: Record<string, number> = {};
    if (params.salaryMin !== undefined) {
      salaryFilter['$gte'] = params.salaryMin;
    }
    if (params.salaryMax !== undefined) {
      salaryFilter['$lte'] = params.salaryMax;
    }
    filter['salary'] = salaryFilter;
  }

  return filter;
}

function serializeEmployee(employee: EmployeeDocument): Employee {
  const json = employee.toJSON() as Record<string, unknown>;
  return {
    id: json['id'] as string,
    userId: json['userId'] as string,
    employeeId: json['employeeId'] as string,
    firstName: json['firstName'] as string,
    lastName: json['lastName'] as string,
    email: json['email'] as string,
    department: json['department'] as Employee['department'],
    position: json['position'] as string,
    salary: json['salary'] as number,
    hireDate: String(json['hireDate']),
    employmentStatus: json['employmentStatus'] as Employee['employmentStatus'],
    manager: json['manager'] as string | undefined,
    phoneNumber: json['phoneNumber'] as string | undefined,
    address: json['address'] as string | undefined,
    emergencyContact: json['emergencyContact'] as string | undefined,
    emergencyPhone: json['emergencyPhone'] as string | undefined,
    createdAt: String(json['createdAt']),
    updatedAt: String(json['updatedAt']),
  };
}

// --- Route definitions ---

const listEmployeesRoute = createRoute({
  method: 'get',
  path: '/employees',
  tags: ['Employees'],
  summary: 'List employees with pagination and filtering',
  security: [{ Bearer: [] }],
  request: {
    query: CursorPaginationSchema.omit({ sort: true })
      .extend({
        sort: z.enum(['createdAt', 'updatedAt', 'hireDate', 'firstName', 'lastName']).default('createdAt'),
      })
      .extend(EmployeeQuerySchema.shape),
  },
  responses: {
    200: {
      description: 'Paginated employee list',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(EmployeeSchema),
            pagination: z.object({
              hasNext: z.boolean(),
              nextCursor: z.string().nullable(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const getEmployeeRoute = createRoute({
  method: 'get',
  path: '/employees/{id}',
  tags: ['Employees'],
  summary: 'Get employee by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Employee found',
      content: {
        'application/json': {
          schema: EmployeeSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Employee not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const createEmployeeRoute = createRoute({
  method: 'post',
  path: '/employees',
  tags: ['Employees'],
  summary: 'Create a new employee',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: EmployeeCreateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Employee created',
      content: {
        'application/json': {
          schema: EmployeeSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const updateEmployeeRoute = createRoute({
  method: 'patch',
  path: '/employees/{id}',
  tags: ['Employees'],
  summary: 'Update employee by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
    body: {
      content: {
        'application/json': {
          schema: EmployeeUpdateSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Employee updated',
      content: {
        'application/json': {
          schema: EmployeeSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Employee not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const deleteEmployeeRoute = createRoute({
  method: 'delete',
  path: '/employees/{id}',
  tags: ['Employees'],
  summary: 'Delete employee by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Employee deleted',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    401: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Employee not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// --- Router ---

export const employeeRouter = new OpenAPIHono<AuthEnv>();

// NOTE: Auth middleware is applied in src/index.ts via app.use('/api/v1/employees/*', authMiddleware)

employeeRouter.openapi(listEmployeesRoute, async (c) => {
  const userId = c.get('userId');
  const { cursor, limit, sort, order, ...filterParams } = c.req.valid('query');
  const filter = buildEmployeeFilter(filterParams);
  const result = await employeeService.findAll(userId, filter, { cursor, limit, sort, order });
  return c.json(
    {
      data: result.data.map(serializeEmployee),
      pagination: result.pagination,
    },
    200
  );
});

employeeRouter.openapi(getEmployeeRoute, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('role');
  const { id } = c.req.valid('param');
  
  const employee = await employeeService.findById(userId, id);
  
  // Check ownership or admin role
  if (employee.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('Access denied');
  }
  
  return c.json(serializeEmployee(employee), 200);
});

employeeRouter.openapi(createEmployeeRoute, async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');
  const employee = await employeeService.create(userId, body);
  return c.json(serializeEmployee(employee), 201);
});

employeeRouter.openapi(updateEmployeeRoute, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('role');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  
  // Verify ownership or admin role
  const existingEmployee = await employeeService.findById(userId, id);
  if (existingEmployee.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('Access denied');
  }
  
  const employee = await employeeService.update(userId, id, body);
  return c.json(serializeEmployee(employee), 200);
});

employeeRouter.openapi(deleteEmployeeRoute, async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('role');
  const { id } = c.req.valid('param');
  
  // Verify ownership or admin role
  const existingEmployee = await employeeService.findById(userId, id);
  if (existingEmployee.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('Access denied');
  }
  
  await employeeService.delete(userId, id);
  return c.json({ success: true as const, message: 'Employee deleted' }, 200);
});
