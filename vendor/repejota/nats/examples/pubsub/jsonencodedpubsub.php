<?php

use Nats\ConnectionOptions;
use Nats\EncodedConnection;
use Nats\Encoders\JSONEncoder;

require_once __DIR__.'/../../vendor/autoload.php';

$encoder = new JSONEncoder();
$options = new ConnectionOptions();
$client  = new EncodedConnection($options, $encoder);
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
