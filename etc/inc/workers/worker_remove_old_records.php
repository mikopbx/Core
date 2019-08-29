<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2019
 */

require_once 'globals.php';
$filename = "{$GLOBALS['g']['varetc_path']}/storage_device";
if(file_exists($filename)) {
    $mount_point = file_get_contents($filename);
}else{
    exit(0);
}
$out=[];
Util::mwexec("/bin/mount | /bin/busybox grep {$mount_point} | /bin/busybox awk '{print $1}' | head -n 1", $out);
$dev = implode('',$out);

$s   = new Storage();
$MIN_SPACE  = 100; // MB
$free_space = $s->get_free_space($dev);
if($free_space > $MIN_SPACE){
    // Очистка диска не требуется.
    exit(0);
}
$monitor_dir = Storage::get_monitor_dir();
$out = [];
$count_dir = 1;
Util::mwexec("/bin/find {$monitor_dir}*/*/*  -maxdepth 0 -type d  -printf '%T+ %p\n' 2> /dev/null | /bin/sort | /bin/head -n 10 | /bin/busybox awk '{print $2}'", $out);
foreach ($out as $dir_info){
    if(!is_dir($dir_info)){
        echo 'error';
        continue;
    }
    $free_space = $s->get_free_space($dev);
    if($free_space > $MIN_SPACE){
        // Очистка диска не требуется.
        break;
    }
    // Util::mwexec("/bin/find {$dir_info}/* -name *.mp3", $out);
    Util::mwexec("/bin/busybox rm -rf {$dir_info}");
    // @file_put_contents("{$dir_info}/removed_file.txt", implode("\n",$out));
}

