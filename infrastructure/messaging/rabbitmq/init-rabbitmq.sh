#!/bin/bash
# =============================================================================
# RabbitMQ Initialization Script
# Sets up exchanges and initial configuration
# =============================================================================

# Wait for RabbitMQ to be ready (with timeout)
for i in {1..30}; do
  if rabbitmq-diagnostics -q ping 2>/dev/null; then
    echo "RabbitMQ is up. Setting up infrastructure..."

    # Create the topic exchange for events (non-blocking)
    rabbitmqctl eval 'rabbit_exchange:declare(#exchange{name = <<"waiting_room_events">>, type = <<"topic">>, durable = true, auto_delete = false, arguments = []}), ok.' 2>/dev/null || true

    # Create dead-letter exchange and queue for poison messages
    rabbitmqctl eval 'rabbit_exchange:declare(#exchange{name = <<"waiting_room_events.dlx">>, type = <<"direct">>, durable = true, auto_delete = false, arguments = []}), ok.' 2>/dev/null || true
    rabbitmqctl eval 'rabbit_queue:declare(#queue{name = <<"waiting_room_dead_letter">>, durable = true, auto_delete = false, arguments = []}), ok.' 2>/dev/null || true
    rabbitmqctl eval 'rabbit_queue:bind(#queue{name = <<"waiting_room_dead_letter">>}, #exchange{name = <<"waiting_room_events.dlx">>}, <<"deadletter">>), ok.' 2>/dev/null || true

    # Setup default policies (non-blocking)
    rabbitmqctl set_policy ha-all '^waiting.*' '{"ha-mode":"all","ha-sync-batch-size":5,"ha-sync-mode":"automatic"}' 2>/dev/null || true

    echo "RabbitMQ infrastructure setup complete"
    exit 0
  fi

  echo "Waiting for RabbitMQ [Attempt $i/30]..."
  sleep 1
done

echo "RabbitMQ initialization timed out, but continuing..."
exit 0
