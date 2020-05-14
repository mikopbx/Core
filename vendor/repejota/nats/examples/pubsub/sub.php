<?php
require_once __DIR__.'/../../vendor/autoload.php';

$client = new \Nats\Connection();
$client->connect();

// Simple Subscriber.
$client->subscribe(
    'foo',
    function ($message) {
        printf("Data: %s\r\n", $message->getBody());
    }
);

$client->close();
