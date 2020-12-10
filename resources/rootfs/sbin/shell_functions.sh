#!/bin/sh
# Пример вызова метода библиотеки:
# /sbin/shell_functions.sh 'killprocesses' '/storage/usbdisk1' -TERM 3
# $1 - имя метода
# $2 ... $4 - параметры метода

kill_by_pids()
{
    handles=$1;
    if [ "${handles}x" != "x" ]; then
        for handle in $handles
        do
            if [ "$MAIN_PID" = "$handle" ] || [ "$REBOOT_PID" = "$handle" ]; then
                # Это ID основного процесса. Его не трогаем.
                echo "---- IGNORE PID - $MAIN_PID ----"
            else
                kill "$2" "${handle}" > /dev/null 2>&1
                resultKill=$?;
                if [ "$resultKill" = "0" ]; then
                    # name=$(/bin/busybox ps -A -f -o pid,args | /bin/busybox grep "${handle}" | /bin/busybox grep -v grep);
                    # echo " |   - ERROR kill ${handle} ${name} result: $resultKill";
                    # else
                    echo " |   - kill process ${handle} with option: $2 return: $resultKill"
                fi;
            fi
        done
    fi
}

killprocesses()
{
    proc_name=$1;
    handles=$(/bin/busybox lsof | /bin/busybox grep "$proc_name" | /bin/busybox awk  '{ print $1}' | /bin/busybox uniq);
    kill_by_pids "$handles" "$2";
    sleep "$3"
}

killprocess_by_name()
{
    proc_name=$1;
    handles=$(/bin/busybox ps -A -f | /bin/busybox grep "$proc_name" | /bin/busybox grep -v grep | /bin/busybox awk  '{ print $1}' | /bin/busybox uniq);
    kill_by_pids "$handles" "$2";
    sleep "$3"
}

f_umount()
{
    if [ -b "$1" ]; then
      filter="^$1";
    else
      filter="${1} type";
    fi
    device=$(/bin/mount | /bin/busybox grep "$filter" | /bin/busybox awk  '{ print $1}');
    mountPoint=$(/bin/mount | /bin/busybox grep "$filter" | /bin/busybox awk  '{ print $3}');

    res=$(/bin/mount | /bin/busybox grep "^${device}");
    if [ "${res}x" != "x" ]; then
        echo " |   - try umount device=${device}, mount point=${mountPoint}";
        result=$(/bin/umount -f "$device" 2>&1);
        if [ "${result}x" != "x" ]; then
            /bin/umount -l "$device" >/dev/null 2> /dev/null;
        fi
    fi

    res=$(/bin/mount | /bin/busybox grep "^${device}");
    if [ "${res}x" != "x" ]; then
       echo " |   - ERROR umount '${device}' / '${mountPoint}'";
    fi
}

if [ "${1}x" != "x" ]; then
    "$1" "$2" "$3" "$4" 2>/dev/null;
fi
