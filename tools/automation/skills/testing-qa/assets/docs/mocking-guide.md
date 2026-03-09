# Mocking Guide — Backend/Frontend Testing

## Mock Factory Pattern

Create reusable mock factories to avoid duplicating mock setups:

```typescript
// Common mock factory for repository-style dependencies
const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
});
```

## Provider Mocking

### Repository Adapter

```typescript
{
  provide: 'AppointmentRepository',
  useValue: createRepositoryMock(),
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

## Chaining Query Builders

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
