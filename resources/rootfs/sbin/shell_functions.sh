#!/bin/sh
#
# MikoPBX - free phone system for small business
# Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with this program.
# If not, see <https://www.gnu.org/licenses/>.
#

# Пример вызова метода библиотеки:
# /sbin/shell_functions.sh 'killprocesses' '/storage/usbdisk1' -TERM 3
# $1 - имя метода
# $2 ... $4 - параметры метода

echoToTeletype()
{
  echo "$1";
  dev='/dev/ttyS0';
  serialInfo="$(/bin/busybox setserial -g "$dev" 2> /dev/null)";
  if [ "${serialInfo}x" = 'x' ]; then
    return;
  fi;
  echo "$serialInfo" | /bin/grep unknown > /dev/null 2> /dev/null;
  resultSetSerial="$?";
  if [ ! "$resultSetSerial" = '0' ]; then
     # Device ttys found
     echo "$1" >> "$dev"
  fi;
}

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

freeSwapByName(){
  storage=$1;
  handles=$(/sbin/swapon -s | /bin/busybox grep "$storage" | /bin/busybox awk  '{ print $1}');
  for handle in $handles
  do
      if [ -f "$handle" ] || [ -b "$handle" ]; then
        /sbin/swapoff "$handle";
        echo " |   - umount swap ${handle} return $?"
      fi
  done
}

f_umount()
{
    if [ -f '/.dockerenv' ]; then
      return;
    fi;

    if [ -b "$1" ]; then
      filter="^$1";
    else
      filter="${1} type";
    fi
    device=$(/bin/mount | /bin/busybox grep "$filter" | /bin/busybox awk  '{ print $1}');
    mountPoint=$(/bin/mount | /bin/busybox grep "$filter" | /bin/busybox awk  '{ print $3}');

    if [ "${device}x" = "x" ]; then
      return;
    fi;

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
