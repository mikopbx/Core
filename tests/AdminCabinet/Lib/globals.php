<?php 

$config_file = getenv('CONFIG_FILE');
if(!file_exists($config_file)) {
    $config_file = 'config/local.conf.json';
}
if(!file_exists($config_file)) {
    $config_file = '../config/local.conf.json';
}
$GLOBALS['CONFIG'] = json_decode(file_get_contents($config_file), true);

$GLOBALS['BROWSERSTACK_USERNAME'] = getenv('BROWSERSTACK_USERNAME');
if(!$GLOBALS['BROWSERSTACK_USERNAME']) $GLOBALS['BROWSERSTACK_USERNAME'] = $GLOBALS['CONFIG']['user'];

$GLOBALS['BROWSERSTACK_ACCESS_KEY'] = getenv('BROWSERSTACK_ACCESS_KEY');
if(!$GLOBALS['BROWSERSTACK_ACCESS_KEY']) $GLOBALS['BROWSERSTACK_ACCESS_KEY'] = $GLOBALS['CONFIG']['key'];

$GLOBALS['SERVER_PBX'] = getenv('SERVER_PBX');
if(!$GLOBALS['SERVER_PBX']) {
    $GLOBALS['SERVER_PBX']='https://172.16.32.72';
}

$GLOBALS['BUILD_NUMBER'] = getenv('BUILD_NUMBER');
if(!$GLOBALS['BUILD_NUMBER']) {
    $GLOBALS['BUILD_NUMBER']='Unknown';
}

$GLOBALS['MIKO_LICENSE_KEY'] = getenv('MIKO_LICENSE_KEY');
if(!$GLOBALS['MIKO_LICENSE_KEY']) {
    $GLOBALS['MIKO_LICENSE_KEY']=$GLOBALS['CONFIG']['MIKO_LICENSE_KEY'];
}



