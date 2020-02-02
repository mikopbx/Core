<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 1 2020
 */

/**
 * Общие переменные для Web интерфейса.
 */
require_once 'globals.php';
$var_www        = '/var/cache/www';
$log_www        = '/var/log/www';
$www            = realpath($g['www_path']);
$app_dir        = $www.'/admin-cabinet/app';

$pbx_dirs = PBX::get_asterisk_dirs();
$g = $GLOBALS['g'];

$phalcon_settings = array(
    'database' => array(
        'adapter' 	    => 'Sqlite',
        'dbfile'        => $g['pt1c_db_path'],
    ),
    'application' 	    => array(
        'kind' 	        => $g['pt1c_pbx_name_kind'],
        'cacheDir' 	    => $var_www .'/admin-cabinet/cache/volt/',
        'metacacheDir'  => $var_www .'/back-end/cache/metadata/',
        'modelscacheDir'=> $var_www .'/back-end/cache/datacache/',
        'logDir'        => $log_www .'/admin-cabinet/logs/',
        'viewsDir' 	    => $app_dir .'/views/',
        'controllersDir'=> $app_dir .'/controllers/',
        'pluginsDir'    => $app_dir .'/plugins/',
        'formsDir'      => $app_dir .'/forms/',
        'libraryDir'    => $app_dir .'/library/',
        'modelsDir'     => $www .'/back-end/models/',
        'modulesDir'    => $pbx_dirs['custom_modules'].'/',
        'jsCacheDir'    => $pbx_dirs['cache_js_dir'].'/',
        'cssCacheDir'   => $pbx_dirs['cache_css_dir'].'/',
        'imgCacheDir'   => $pbx_dirs['cache_img_dir'].'/',
		'mediaDir'      => $pbx_dirs['media'].'/',
		'backendDir'    => $www .'/back-end/',
        'modulesBaseDir'=> $www .'/back-end/modules/',
        'debugMode'	    => false,
    ),
    'cdrdatabase' => array(
        'adapter'       => 'Sqlite',
        'dbfile'        => Cdr::getPathToDB(),
    ),
    'logdatabase' => array(
        'adapter'       => 'Sqlite',
        'dbfile'        => dirname(Cdr::getPathToDB()).'/events_log.db',
    ),
    'beanstalk' => array(
        'host' => '127.0.0.1',
        'port' => 4229
    ),

);

return $phalcon_settings;
