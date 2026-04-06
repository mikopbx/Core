#
# MikoPBX - free phone system for small business
# Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

ENV_FILE=".env"
# vars STORAGE_UUID, UPDATE_IMG_FILE in ENV_FILE
if [ -f "$ENV_FILE" ]; then
    export $(xargs < "$ENV_FILE");
fi
# Задание переменных
MOUNT_DIR="/mnt"
STORAGE_DIR="/storage/usbdisk1"
FIRMWARE_IMG_PATH="$MOUNT_DIR/firmware.img"
RAW_IMG_FILE="${UPDATE_IMG_FILE}_D.raw"

# Создание необходимых директорий
mkdir -p "$MOUNT_DIR" "$STORAGE_DIR";

echo " - mount storage for upgrade";
mount -rw UUID="$STORAGE_UUID" "$STORAGE_DIR" 2> /dev/null;
MOUNT_RESULT=$?
if [ "$MOUNT_RESULT" -ne 0 ]; then
  echo " - Fail mount storage with UUID=$STORAGE_UUID to $STORAGE_DIR ..."
  exit 1
fi

echo " - unpack image file to raw format";
/bin/busybox gunzip -c "$UPDATE_IMG_FILE" > "$RAW_IMG_FILE";
echo " - gunzip return $?";
loopName="$(losetup --show -f -o 524288 "$RAW_IMG_FILE")";

echo " - mount raw image file";
mount -t vfat "$loopName" "$MOUNT_DIR" -o ro,umask=0000;
MOUNT_RESULT=$?;
if [ "$MOUNT_RESULT" -ne 0 ]; then
  echo " - Fail mount img with $loopName to $MOUNT_DIR ...";
  rm "$RAW_IMG_FILE";
  exit 1
fi

if [ -f "$FIRMWARE_IMG_PATH" ]; then
  cp "$FIRMWARE_IMG_PATH" "$UPDATE_IMG_FILE";
  echo " - replace fake image file result $?";
else
  echo " - FAIL replace fake image file";
fi

echo " - unmount and clean temp files...";
umount "$MOUNT_DIR";
losetup -d "$loopName";
rm "$RAW_IMG_FILE";
umount "$STORAGE_DIR";

echo " - unmount offload and storage partition, and clean temp files...";
freeupoffload;
freestorage;