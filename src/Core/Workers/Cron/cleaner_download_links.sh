#!/bin/sh
#
# Copyright © MIKO LLC - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential
# Written by Alexey Portnov, 8 2020
#

# $root_dir - каталог, файлы в котором доступны для скачивания через nginx.
#
# Пример:
#   Создадим файл и ссылку на него в $root_dir;
#   echo privet > /tmp/test.txt; ln -s /tmp/test.txt /usr/www/sites/pbxcore/files/cache/test.txt;
#   Ссылка будет уничтожена через 5 минут.
#
# Пример 2:
#   Создадим файл и ссылку на него в $root_dir;
#   echo privet > /tmp/temp-test.txt; ln -s /tmp/temp-test.txt /usr/www/sites/pbxcore/files/cache/test.txt;
#   Ссылка И ФАЙЛ будут уничтожены через 5 минут.
#   Если имя файла содержит "/temp-", то он также будет удален.

root_dir=$(grep -rn 'downloadCachePath' /etc/inc/mikopbx-settings.json | cut -d'"' -f4);
if [ ! -d "${root_dir}" ]; then
    exit 2;
fi

# Получим все символические ссылки.
links=$(/bin/find "${root_dir}" -mmin +5 -type l);

if [ ! "${links}x" = "x" ]; then
  filesForRemove=$(readlink $links | grep '/temp-');
  # Получим все временные файлы.
  for file in $filesForRemove
  do
    # Проверим, свободен ли файл.
    /usr/bin/lsof $file  > /dev/null 2> /dev/null;
    # Файл должен существовать.
    # Должен быть освобожден всеми процессами.
    # Не являться корневой директорией $root_dir.
    if  [ $? -eq 1 ] && [ ! "${file}" = "${root_dir}" ] && [ -f "${file}" ]; then
      /usr/sbin/rm -rf "$file";
    fi
  done
fi

# Чистим директории, содержашие ссылки.
for file in $links
do
  # Проверим, свободен ли файл.
  /usr/bin/lsof $file  > /dev/null 2> /dev/null;
  if  [ $? -eq 1 ]; then
      dir=$(/usr/bin/dirname "$file");
      # Если Файл не является корневой директорией - удаляем.
      if [ ! "${file}" = "${root_dir}" ]; then
        /usr/sbin/rm -rf "${file}";
      fi
      # Если директория не является корневой - удаляем.
      if [ ! "${dir}" = "${root_dir}" ]; then
        /usr/sbin/rm -rf "$dir";
      fi
  fi
done