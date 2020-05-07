#!/bin/sh

if [ "$1" = "" ]; then
    exit 1;
fi

root_dir="/var/spool/${1}/";
if [ ! -d "${root_dir}" ]; then
    exit 2;
fi

links=$(/bin/find "${root_dir}" -mmin +5 -type l);
for file in $links
do
    /usr/bin/lsof $file  > /dev/null 2> /dev/null;
    if  [ $? -eq 1 ]; then
        dir=$(/usr/bin/dirname "$file");
        /usr/sbin/rm -rf "$dir";
    fi
done