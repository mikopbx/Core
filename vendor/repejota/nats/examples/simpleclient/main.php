<?php
require_once __DIR__.'/../../vendor/autoload.php';

use Nats\Connection as NatsClient;

$nc = new NatsClient();
$nc->connect();

printf('Connected to NATS at %s'.PHP_EOL, $nc->connectedServerId());

$nc->wait();
