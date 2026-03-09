# ACK/NACK Strategy — RabbitMQ Consumer

## Overview

The Consumer uses **manual acknowledgment** (`noAck: false`) with `prefetchCount: 1` to process one message at a time.

## Strategy

| Scenario                           | Action                            | Requeue? | Rationale                                                  |
| ---------------------------------- | --------------------------------- | -------- | ---------------------------------------------------------- |
| Success                            | `channel.ack(msg)`                | N/A      | Message processed correctly                                |
| Validation error                   | `channel.nack(msg, false, false)` | No    | Invalid data won't fix on retry; send to DLQ if configured |
| Transient error (DB down, timeout) | `channel.nack(msg, false, true)`  | Yes   | Temporary failure; retry later                             |

## Code Pattern

```typescript
try {
  // Process message...
  await this.service.processAppointment(data);
  channel.ack(originalMsg);
} catch (error: unknown) {
  if (error instanceof BadRequestException) {
    // Validation error — don't requeue
    channel.nack(originalMsg, false, false);
  } else {
    // Transient error — requeue for retry
    channel.nack(originalMsg, false, true);
  }
}
```

## Risk: Prefetch=1 Blocking

With `prefetchCount: 1`, a stuck message blocks the entire queue. The nack strategy above prevents this by:

- Immediately discarding validation errors (no loop)
- Requeueing transient errors (but RabbitMQ will deliver to another consumer or retry)
