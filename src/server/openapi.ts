import { commercePaths, commerceSchemas } from './commerce-openapi';
const errorSchema = {
  type: 'object',
  required: ['error', 'requestId'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        fields: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    requestId: { type: 'string', format: 'uuid' },
  },
};
const userSchema = {
  type: 'object',
  required: ['id', 'email', 'name', 'role'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['customer', 'staff'] },
  },
};
const productProperties = {
  id: { type: 'string' },
  sku: { type: 'string' },
  name: { type: 'string' },
  category: {
    type: 'string',
    enum: ['Accessories', 'Audio', 'Computers', 'Displays', 'Workspace'],
  },
  description: { type: 'string' },
  priceCents: {
    type: 'integer',
    minimum: 0,
    description: 'EUR in integer cents. 12900 means EUR 129.00.',
  },
  stock: { type: 'integer', minimum: 0 },
  art: { type: 'string' },
  color: { type: 'string' },
  specs: { type: 'object', additionalProperties: { type: 'string' } },
};
const productSchema = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(productProperties),
  properties: productProperties,
};
const inventorySchema = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(productProperties), 'costCents', 'supplier', 'stockStatus'],
  properties: {
    ...productProperties,
    costCents: { type: 'integer', minimum: 0 },
    supplier: { type: 'string' },
    stockStatus: {
      type: 'string',
      enum: ['in-stock', 'low-stock', 'out-of-stock'],
    },
  },
};
function json(schema: unknown) {
  return { 'application/json': { schema } };
}
function response(description: string, schema: unknown) {
  return { description, content: json(schema) };
}
const errors = Object.fromEntries(
  [
    [400, 'Invalid JSON'],
    [401, 'Authentication required or invalid credentials'],
    [403, 'Permission or CSRF check failed'],
    [404, 'Resource not found'],
    [405, 'Method not allowed'],
    [413, 'Body exceeds 16 KiB'],
    [415, 'Unsupported content type'],
    [422, 'Validation failed'],
    [429, 'Too many login attempts'],
    [500, 'Unexpected server error'],
  ].map(([code, label]) => [
    String(code),
    {
      ...response(String(label), { $ref: '#/components/schemas/Error' }),
      ...(code === 429
        ? {
            headers: {
              'Retry-After': {
                description: 'Seconds until another attempt is allowed.',
                schema: { type: 'integer' },
              },
            },
          }
        : {}),
    },
  ]),
);
const query = [
  {
    name: 'q',
    schema: { type: 'string', maxLength: 100, default: '' },
    description:
      'Case-insensitive literal substring of product name or SKU. Trimmed. Wildcards are treated as text.',
  },
  {
    name: 'category',
    schema: {
      type: 'string',
      enum: ['all', 'Accessories', 'Audio', 'Computers', 'Displays', 'Workspace'],
      default: 'all',
    },
  },
  {
    name: 'stock',
    schema: {
      type: 'string',
      enum: ['all', 'available', 'low', 'out'],
      default: 'all',
    },
    description: 'available means stock > 0; low means 1 to 5 inclusive; out means zero.',
  },
  {
    name: 'sort',
    schema: {
      type: 'string',
      enum: ['name-asc', 'name-desc', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc'],
      default: 'name-asc',
    },
    description: 'Equal values are ordered by product ID ascending.',
  },
  {
    name: 'page',
    schema: { type: 'integer', minimum: 1, maximum: 100000, default: 1 },
  },
  {
    name: 'pageSize',
    schema: { type: 'integer', enum: [6, 12, 24], default: 6 },
  },
].map((p) => ({ ...p, in: 'query', required: false }));
function listSchema(inventory = false) {
  return {
    type: 'object',
    required: [
      'items',
      'total',
      'page',
      'pageSize',
      'totalPages',
      ...(inventory ? ['summary'] : []),
    ],
    properties: {
      items: {
        type: 'array',
        items: {
          $ref: inventory
            ? '#/components/schemas/InventoryProduct'
            : '#/components/schemas/Product',
        },
      },
      total: { type: 'integer', minimum: 0 },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
      totalPages: { type: 'integer', minimum: 1 },
      ...(inventory
        ? {
            summary: {
              type: 'object',
              description: 'Counts across the full inventory, unaffected by filters.',
              required: ['products', 'units', 'lowStock', 'outOfStock'],
              properties: {
                products: { type: 'integer' },
                units: { type: 'integer' },
                lowStock: { type: 'integer' },
                outOfStock: { type: 'integer' },
              },
            },
          }
        : {}),
    },
  };
}
const userResponse = {
  type: 'object',
  required: ['user'],
  properties: { user: { $ref: '#/components/schemas/User' } },
};
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Stockroom API',
    version: '0.2.0',
    description:
      'Increment 2: catalog, customer cart, order placement, own order history, and staff inventory. Sign in with an account from .local/demo-accounts.txt. Try it out automatically retrieves a CSRF token for all state-changing requests. Cookies are shared with the application in this browser. API clients must preserve cookies, send Origin matching APP_ORIGIN, and send X-CSRF-Token for POST, PATCH, PUT, and DELETE requests. GET /api/auth/csrf supplies the token; successful login rotates it. Customer orders deduct stock atomically; no payments or web stock editing are available. Copy a real checkoutToken from GET /api/cart before ordering. Unknown or repeated list query parameters are rejected. All business API responses are no-store and include X-Request-ID.',
  },
  servers: [{ url: '/', description: 'Current application origin' }],
  security: [{ sessionCookie: [] }],
  tags: [
    { name: 'Authentication' },
    { name: 'Catalog' },
    { name: 'Operations' },
    { name: 'Cart' },
    { name: 'Orders' },
    { name: 'System' },
  ],
  paths: {
    ...commercePaths,
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Check server readiness',
        security: [],
        responses: {
          200: response('Server is responding', {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              release: { type: 'string' },
            },
          }),
        },
      },
    },
    '/api/auth/csrf': {
      get: {
        tags: ['Authentication'],
        summary: 'Get a CSRF token and cookie',
        security: [],
        responses: {
          200: response('Keep the cookie and use this token in X-CSRF-Token', {
            type: 'object',
            required: ['csrfToken'],
            properties: { csrfToken: { type: 'string' } },
          }),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in',
        security: [],
        description:
          'Five unsuccessful attempts per normalized email per 15 minutes. The sixth attempt returns 429. Successful login clears that email counter. An installation-wide cap permits 30 attempts per minute. Sessions expire after 30 minutes without an authenticated request or 8 hours in total. Passwords are not trimmed. Requires same-origin CSRF token and cookie.',
        parameters: [
          {
            name: 'X-CSRF-Token',
            in: 'header',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            additionalProperties: false,
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', maxLength: 254 },
              password: {
                type: 'string',
                minLength: 1,
                maxLength: 128,
                format: 'password',
              },
            },
          }),
        },
        responses: {
          200: response('Session created and CSRF token rotated', {
            ...userResponse,
            required: ['user', 'csrfToken'],
            properties: {
              ...userResponse.properties,
              csrfToken: { type: 'string' },
            },
          }),
          400: errors['400'],
          401: errors['401'],
          403: errors['403'],
          413: errors['413'],
          415: errors['415'],
          422: errors['422'],
          429: errors['429'],
        },
      },
    },
    '/api/auth/session': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the signed-in account',
        responses: {
          200: response('Current account', userResponse),
          401: errors['401'],
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign out and invalidate the server session',
        parameters: [
          {
            name: 'X-CSRF-Token',
            in: 'header',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          204: { description: 'Session revoked and cookies cleared' },
          401: errors['401'],
          403: errors['403'],
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Catalog'],
        summary: 'Search, filter, sort, and paginate products',
        description:
          'All supplied filters combine with AND. A page beyond the last page returns an empty items array. totalPages is at least 1, including an empty result.',
        parameters: query,
        responses: {
          200: response('Matching products', listSchema()),
          401: errors['401'],
          422: errors['422'],
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get one product',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'arc-keyboard',
          },
        ],
        responses: {
          200: response('Product details', {
            type: 'object',
            required: ['product'],
            properties: { product: { $ref: '#/components/schemas/Product' } },
          }),
          401: errors['401'],
          404: errors['404'],
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Catalog'],
        summary: 'List categories and full-catalog counts',
        responses: {
          200: response('Categories', {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'count'],
                  properties: {
                    name: { type: 'string' },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          }),
          401: errors['401'],
        },
      },
    },
    '/api/inventory': {
      get: {
        tags: ['Operations'],
        summary: 'Read staff inventory',
        description:
          'Staff only. Contains supplier and unit cost fields that are omitted from customer catalog responses.',
        parameters: query,
        responses: {
          200: response('Inventory and full-inventory summary', listSchema(true)),
          401: errors['401'],
          403: errors['403'],
          422: errors['422'],
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'stockroom_session',
        description:
          'Created by login. Browser sends it automatically. HttpOnly; cannot be manually edited here.',
      },
    },
    schemas: {
      ...commerceSchemas,
      User: userSchema,
      Product: productSchema,
      InventoryProduct: inventorySchema,
      Error: errorSchema,
    },
  },
};
