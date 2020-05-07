<?php

use Nats\Connection;

require_once __DIR__.'/../../vendor/autoload.php';

$client = new Connection();
$client->connect();

// Simple Publisher.
$client->publish('foo', 'bar');
$client->close();
