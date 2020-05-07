<?php

use Nats\Connection;

require_once __DIR__.'/../../vendor/autoload.php';

$client = new Connection();
$client->connect();

// Publish Subscribe.
// Simple Subscriber.
$client->subscribe(
    'foo',
    function ($message) {
        printf("Data: %s\r\n", $message->getBody());
    }
);

// Simple Publisher.
$client->publish('foo', 'Marty McFly');

// Wait for 1 message.
$client->wait(1);

$client->close();
