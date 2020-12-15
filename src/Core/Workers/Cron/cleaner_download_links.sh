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

root_dir=$(grep -rn 'downloadCacheDir' /etc/inc/mikopbx-settings.json | cut -d'"' -f4);
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