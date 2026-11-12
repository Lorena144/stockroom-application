const integer = { type: 'integer', minimum: 0 };
const reference = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const exampleCart = {
  version: 1,
  currency: 'EUR',
  items: [
    {
      productId: 'arc-keyboard',
      sku: 'SR-101',
      name: 'Arc mechanical keyboard',
      art: 'keyboard',
      color: 'sand',
      quantity: 2,
      stock: 18,
      unitPriceCents: 12900,
      addedPriceCents: 12900,
      subtotalCents: 25800,
      priceChanged: false,
      available: true,
    },
  ],
  itemCount: 1,
  totalQuantity: 2,
  totalCents: 25800,
  canCheckout: true,
  checkoutToken: 'a'.repeat(64),
};
const exampleOrder = {
  id: 'ord-3fcd6b4a-5be8-43bd-b9cb-c9b3c42dad8b',
  number: 'SR-01AB23CD45EF',
  status: 'placed',
  currency: 'EUR',
  totalCents: 25800,
  itemCount: 1,
  totalQuantity: 2,
  createdAt: '2026-11-12T12:00:00.000Z',
  items: [
    {
      productId: 'arc-keyboard',
      sku: 'SR-101',
      name: 'Arc mechanical keyboard',
      quantity: 2,
      unitPriceCents: 12900,
      subtotalCents: 25800,
    },
  ],
};
const csrf = {
  name: 'X-CSRF-Token',
  in: 'header',
  required: true,
  schema: { type: 'string' },
  description:
    'Swagger obtains and refreshes this automatically. Other clients must keep the CSRF cookie and send this header plus the exact application Origin.',
};
const productPath = {
  name: 'productId',
  in: 'path',
  required: true,
  schema: { type: 'string', pattern: '^[a-z0-9-]+$', maxLength: 100 },
  example: 'arc-keyboard',
};
const orderPath = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  example: exampleOrder.id,
};
const response = (description: string, schema: unknown, example: unknown) => ({
  description,
  content: { 'application/json': { schema, example } },
});
function failure(status: number, code: string, message: string, fields?: Record<string, string[]>) {
  return response(`HTTP ${status}: ${message}`, reference('Error'), {
    error: { code, message, ...(fields ? { fields } : {}) },
    requestId: 'e032e7ca-9286-41cf-a134-8fd91bc5c619',
  });
}
const accessErrors = {
  401: failure(401, 'UNAUTHENTICATED', 'Please sign in to continue.'),
  403: failure(403, 'FORBIDDEN', 'This area is available to customers only.'),
};
const mutationErrors = {
  ...accessErrors,
  400: failure(400, 'INVALID_JSON', 'Send a valid JSON request body.'),
  413: failure(413, 'BODY_TOO_LARGE', 'The request body is too large.'),
  415: failure(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send an application/json request body.'),
  422: failure(422, 'VALIDATION_ERROR', 'Check the supplied values.', {
    quantity: ['Too small: expected number to be >=1'],
  }),
};
const csrfError = {
  ...failure(403, 'CSRF_INVALID', 'Refresh your session and try again.'),
  content: {
    'application/json': {
      schema: reference('Error'),
      examples: {
        csrf: {
          value: {
            error: {
              code: 'CSRF_INVALID',
              message: 'Refresh your session and try again.',
            },
            requestId: 'e032e7ca-9286-41cf-a134-8fd91bc5c619',
          },
        },
        origin: {
          value: {
            error: {
              code: 'ORIGIN_REJECTED',
              message: 'This request must come from the application origin.',
            },
            requestId: 'e032e7ca-9286-41cf-a134-8fd91bc5c619',
          },
        },
        staff: {
          value: {
            error: {
              code: 'FORBIDDEN',
              message: 'This area is available to customers only.',
            },
            requestId: 'e032e7ca-9286-41cf-a134-8fd91bc5c619',
          },
        },
      },
    },
  },
};
const body = (schema: unknown, example: unknown) => ({
  required: true,
  content: { 'application/json': { schema, example } },
});
const quantity = { type: 'integer', minimum: 1, maximum: 99 };
const cartResponse = () =>
  response(
    'Current cart with live prices and server-calculated totals. checkoutToken must be copied from a real response.',
    {
      type: 'object',
      required: ['cart'],
      properties: { cart: reference('Cart') },
    },
    { cart: exampleCart },
  );
const orderResponse = (replayed: boolean) =>
  response(
    replayed
      ? 'Existing order returned; no new order and no further stock reduction.'
      : 'Order created; stock reduced once and cart emptied.',
    {
      type: 'object',
      required: ['order', 'replayed'],
      properties: { order: reference('Order'), replayed: { type: 'boolean' } },
    },
    { order: exampleOrder, replayed },
  );
export const commerceSchemas = {
  CartItem: {
    type: 'object',
    required: Object.keys(exampleCart.items[0]),
    additionalProperties: false,
    properties: {
      productId: { type: 'string' },
      sku: { type: 'string' },
      name: { type: 'string' },
      art: { type: 'string' },
      color: { type: 'string' },
      quantity,
      stock: integer,
      unitPriceCents: integer,
      addedPriceCents: integer,
      subtotalCents: integer,
      priceChanged: { type: 'boolean' },
      available: { type: 'boolean' },
    },
  },
  Cart: {
    type: 'object',
    required: Object.keys(exampleCart),
    additionalProperties: false,
    properties: {
      version: integer,
      currency: { type: 'string', enum: ['EUR'] },
      items: { type: 'array', maxItems: 50, items: reference('CartItem') },
      itemCount: integer,
      totalQuantity: integer,
      totalCents: integer,
      canCheckout: { type: 'boolean' },
      checkoutToken: {
        type: 'string',
        pattern: '^[a-f0-9]{64}$',
        description:
          'Opaque server-signed review token for this account, cart version, quantities, and current prices. Copy a real value from GET /api/cart; example tokens are placeholders.',
      },
    },
  },
  OrderItem: {
    type: 'object',
    required: Object.keys(exampleOrder.items[0]),
    additionalProperties: false,
    properties: {
      productId: { type: 'string' },
      sku: { type: 'string' },
      name: { type: 'string' },
      quantity,
      unitPriceCents: integer,
      subtotalCents: integer,
    },
  },
  OrderSummary: {
    type: 'object',
    required: Object.keys(exampleOrder).filter((k) => k !== 'items'),
    properties: {
      id: { type: 'string' },
      number: { type: 'string' },
      status: { type: 'string', enum: ['placed'] },
      currency: { type: 'string', enum: ['EUR'] },
      totalCents: integer,
      itemCount: integer,
      totalQuantity: integer,
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Order: {
    allOf: [
      reference('OrderSummary'),
      {
        type: 'object',
        required: ['items'],
        properties: { items: { type: 'array', items: reference('OrderItem') } },
      },
    ],
  },
};
export const commercePaths = {
  '/api/cart': {
    get: {
      tags: ['Cart'],
      summary: 'Get your cart and review its current prices',
      description:
        'Customers only. The account comes from the session, never a supplied user ID. No query parameters. An unused cart has version 0. The cart persists after logout. No stock is reserved. Every read returns current prices and an updated checkoutToken.',
      responses: {
        200: cartResponse(),
        ...accessErrors,
        422: failure(422, 'VALIDATION_ERROR', 'This operation does not accept query parameters.'),
      },
    },
  },
  '/api/cart/items': {
    post: {
      tags: ['Cart'],
      summary: 'Add units of a product to your cart',
      description:
        'Adds to the existing quantity, or creates a new line. Integer quantity 1–99; combined line quantity cannot exceed 99 or current stock. At most 50 distinct products. Returns 200 for both a new line and an existing line. Does not reduce stock.',
      parameters: [csrf],
      requestBody: body(
        {
          type: 'object',
          additionalProperties: false,
          required: ['productId', 'quantity'],
          properties: {
            productId: {
              type: 'string',
              pattern: '^[a-z0-9-]+$',
              maxLength: 100,
            },
            quantity,
          },
        },
        { productId: 'arc-keyboard', quantity: 2 },
      ),
      responses: {
        200: cartResponse(),
        ...mutationErrors,
        403: csrfError,
        404: failure(404, 'PRODUCT_NOT_FOUND', 'This product could not be found.'),
        409: failure(409, 'INSUFFICIENT_STOCK', 'The requested quantity is no longer available.', {
          'arc-keyboard': [
            'Only 1 units are available. Reduce the quantity or remove this product.',
          ],
        }),
      },
    },
  },
  '/api/cart/items/{productId}': {
    patch: {
      tags: ['Cart'],
      summary: 'Replace the quantity of one of your cart lines',
      description:
        'Sets the absolute quantity (not an increment). Use DELETE to remove a line. Validates current stock. A missing line returns 404 even if the product is in another customer’s cart.',
      parameters: [productPath, csrf],
      requestBody: body(
        {
          type: 'object',
          additionalProperties: false,
          required: ['quantity'],
          properties: { quantity },
        },
        { quantity: 3 },
      ),
      responses: {
        200: cartResponse(),
        ...mutationErrors,
        403: csrfError,
        404: failure(404, 'CART_ITEM_NOT_FOUND', 'This item could not be found in your cart.'),
        409: failure(409, 'INSUFFICIENT_STOCK', 'The requested quantity is no longer available.'),
      },
    },
    delete: {
      tags: ['Cart'],
      summary: 'Remove one product from your cart',
      description:
        'No request body or query parameters. Returns the current cart. Removing an already absent item returns 404. Does not alter stock.',
      parameters: [productPath, csrf],
      responses: {
        200: response(
          'Item removed; empty cart example.',
          { type: 'object', properties: { cart: reference('Cart') } },
          {
            cart: {
              ...exampleCart,
              version: 2,
              items: [],
              itemCount: 0,
              totalQuantity: 0,
              totalCents: 0,
              canCheckout: false,
            },
          },
        ),
        ...accessErrors,
        403: csrfError,
        404: failure(404, 'CART_ITEM_NOT_FOUND', 'This item could not be found in your cart.'),
        422: failure(422, 'VALIDATION_ERROR', 'This operation does not accept query parameters.'),
      },
    },
  },
  '/api/orders': {
    get: {
      tags: ['Orders'],
      summary: 'List only your own orders',
      description:
        'Customers only. Newest first, with ID descending as a tie breaker. Unknown or repeated query parameters are rejected. An out-of-range page has an empty items array.',
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100000, default: 1 },
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'string', enum: ['6', '12', '24'], default: '6' },
        },
      ],
      responses: {
        200: response(
          'Your orders; product lines are available from the detail endpoint.',
          {
            type: 'object',
            required: ['items', 'total', 'page', 'pageSize', 'totalPages'],
            properties: {
              items: { type: 'array', items: reference('OrderSummary') },
              total: integer,
              page: integer,
              pageSize: integer,
              totalPages: { type: 'integer', minimum: 1 },
            },
          },
          {
            items: [
              Object.fromEntries(Object.entries(exampleOrder).filter(([k]) => k !== 'items')),
            ],
            total: 1,
            page: 1,
            pageSize: 6,
            totalPages: 1,
          },
        ),
        ...accessErrors,
        422: failure(422, 'VALIDATION_ERROR', 'Check the supplied values.'),
      },
    },
    post: {
      tags: ['Orders'],
      summary: 'Place an order from your reviewed cart',
      description:
        'Customers only. First GET /api/cart, then copy its version and checkoutToken. Send a new UUID as Idempotency-Key for a new attempt; keep the same UUID AND body when retrying after a lost response. The example token is a placeholder. Returns 201 for creation or 200 for a replay. The same reviewed cart submitted from two tabs creates one order even with different keys. Reusing a key with different details returns 409. All lines, totals, stock deductions, cart clearing, and duplicate protection commit together. Price changes require a fresh review. Stock changes block placement only if a line is no longer available. No payment is collected; status is placed.',
      parameters: [
        csrf,
        {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          example: 'b594c285-3a6a-45fb-8c73-7f14628e5572',
        },
      ],
      requestBody: body(
        {
          type: 'object',
          additionalProperties: false,
          required: ['cartVersion', 'checkoutToken'],
          properties: {
            cartVersion: {
              type: 'integer',
              minimum: 0,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            checkoutToken: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          },
        },
        { cartVersion: 1, checkoutToken: 'a'.repeat(64) },
      ),
      responses: {
        201: {
          ...orderResponse(false),
          headers: {
            Location: {
              description: 'Saved order API URL',
              schema: { type: 'string' },
            },
          },
        },
        200: orderResponse(true),
        ...mutationErrors,
        403: csrfError,
        409: {
          description:
            'No new order. Refresh and review the cart, or retry the original request after a lost response.',
          content: {
            'application/json': {
              schema: reference('Error'),
              examples: Object.fromEntries(
                [
                  [
                    'empty',
                    'EMPTY_CART',
                    'Your cart is empty. Add a product before placing an order.',
                  ],
                  [
                    'changedCart',
                    'CART_CHANGED',
                    'Your cart changed in another request. Refresh it and review the quantities.',
                  ],
                  [
                    'price',
                    'PRICE_CHANGED',
                    'Prices changed since your cart was displayed. Refresh the cart and review the new total.',
                  ],
                  [
                    'stock',
                    'STOCK_CHANGED',
                    'Some products no longer have enough stock. No order was created.',
                  ],
                  [
                    'key',
                    'IDEMPOTENCY_KEY_REUSED',
                    'This request key was already used for different order details.',
                  ],
                ].map(([name, code, message]) => [
                  name,
                  {
                    value: {
                      error: { code, message },
                      requestId: 'e032e7ca-9286-41cf-a134-8fd91bc5c619',
                    },
                  },
                ]),
              ),
            },
          },
        },
      },
    },
  },
  '/api/orders/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'Get one of your own orders',
      description:
        'The original product names, quantities and integer-cent prices are immutable snapshots. An unknown ID and an order owned by another customer both return the same 404. Staff do not have access.',
      parameters: [orderPath],
      responses: {
        200: response(
          'Saved order details',
          {
            type: 'object',
            required: ['order'],
            properties: { order: reference('Order') },
          },
          { order: exampleOrder },
        ),
        ...accessErrors,
        404: failure(404, 'ORDER_NOT_FOUND', 'This order could not be found.'),
        422: failure(422, 'VALIDATION_ERROR', 'This operation does not accept query parameters.'),
      },
    },
  },
};
