<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */

require_once 'globals.php';
require_once 'Nats/autoloader.php';

$lic = new Mikopbx\License();
$lic->start_worker();