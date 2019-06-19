#!/bin/sh
# Пример вызова метода библиотеки:
# /etc/rc/shell_functions.sh 'killprocesses' '/storage/usbdisk1' -TERM 3
# $1 - имя метода
# $2 ... $4 - параметры метода

killprocesses()
{
    handles=$(/bin/busybox lsof | /bin/busybox grep "$1" | /bin/busybox awk  '{ print $1}' | /bin/busybox uniq);
    for handle in $handles
    do
        if [ $handle != COMMAND ]; then
            echo " |   - process ${handle} still using $1 $2"
            kill $2 ${handle} > /dev/null 2>&1
        fi
    done
    sleep $3
}

f_umount()
{
    res=`/bin/mount | /bin/busybox grep "${1} type"`;
    if [ "${res}x" != "x" ]; then
        result=`/bin/umount -f "$1" 2>&1`;
        if [ "${result}x" != "x" ]; then
            /bin/umount -l "$1" 2>&1 > /dev/null;
        fi
    fi
}

if [ ! "${1}" = "x" ]; then
    $1 $2 $3 $4;
fi
