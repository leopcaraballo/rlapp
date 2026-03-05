# Mocking Guide — NestJS Testing

## Mock Factory Pattern

Create reusable mock factories to avoid duplicating mock setups:

```typescript
// Common mock factory for Mongoose Model
const createModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
});
```

## Provider Mocking

### Mongoose Model

```typescript
import { getModelToken } from '@nestjs/mongoose';

{
  provide: getModelToken('Appointment'),
  useValue: createModelMock(),
}
```

### ConfigService

```typescript
{
  provide: ConfigService,
  useValue: {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'SCHEDULER_INTERVAL_MS': 1000,
        'CONSULTORIOS_TOTAL': 5,
      };
      return config[key];
    }),
  },
}
```

### RabbitMQ Client (ClientProxy)

```typescript
{
  provide: 'NOTIFICATIONS_SERVICE',
  useValue: {
    emit: jest.fn(),
    send: jest.fn(),
    connect: jest.fn(),
  },
}
```

## Chaining Mongoose Queries

When mocking chained queries like `find().sort().exec()`:

```typescript
mockModel.find.mockReturnValue({
  sort: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockData),
  }),
});
```

## Error Path Testing

Always test both success and failure:

```typescript
it("should throw on not found", async () => {
  mockModel.findOneAndUpdate.mockResolvedValue(null);
  await expect(service.assignOffice("id", "1")).rejects.toThrow(
    NotFoundException,
  );
});
```
