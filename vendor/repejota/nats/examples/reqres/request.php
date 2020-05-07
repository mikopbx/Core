<?php
require_once __DIR__.'/../../vendor/autoload.php';

use Nats\Connection;

$client = new Connection();
$client->connect();

// Request.
$client->request(
    'foo',
    'Marty McFly',
    function ($message) {
        echo $message->getBody();
    }
);

$client->close();
