<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once 'globals.php';

$id  = trim($argv[1]);
if(empty($id)){
    exit;
}

$b = new Backup($id);
$b->recover_with_progress();