<?php
require_once __DIR__.'/../../vendor/autoload.php';

$encoder = new \Nats\Encoders\JSONEncoder();
$options = new \Nats\ConnectionOptions();
$client  = new \Nats\EncodedConnection($options, $encoder);
$client->connect();

// Publish Subscribe.
// Simple Subscriber.
$client->subscribe(
    'foo',
    function ($payload) {
        printf("Data: %s\r\n", $payload->getBody()[1]);
    }
);

// Simple Publisher.
$client->publish(
    'foo',
    [
     'Marty',
     'McFly',
    ]
);

// Wait for 1 message.
$client->wait(1);
