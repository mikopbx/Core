#!/bin/bash
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

#
# WARNING!!!
# This script is used solely for system updates.
# It must not rely on external dependencies not packaged with it.
#
# Внимание!!!
# Этот скрипт используется только для обновления системы.
# Он не должен зависеть от внешних зависимостей и других скриптов,
# которых может не быть в исходной системе.

if test -w /dev/ttyS0 && ! /bin/busybox setserial -g /dev/ttyS0 | /bin/grep -q unknown; then
  exec </dev/console > >(/bin/busybox tee /dev/ttyS0) 2>/dev/console
else
  exec </dev/console >/dev/console 2>/dev/console;
fi

# Global variables
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
fi

# mountDiskPart: Mounts a disk partition by UUID.
# Args:
#   $1: UUID of the disk partition.
#   $2: Mount point.
mountDiskPart()
{
  uuid="$1";
  mountpoint="$2";
  if [ '1' = "$(/sbin/blkid | /bin/busybox grep "$uuid" > /dev/null)" ]; then
    echo " - Storage disk with UUID=${uuid} not found..."
    exit 1;
  fi

  mkdir -p "$mountpoint";
  mount -rw UUID="$uuid" "$mountpoint" 2> /dev/null;
  MOUNT_RESULT=$?;
  if [ ! "${MOUNT_RESULT}" = "0" ] ; then
    echo " - Fail mount storage with UUID=${uuid} to ${mountpoint} ..."
    exit 1;
  fi
}

# Mounts storage and configuration partitions
mountPartitions() {
    umount "/system" 2>/dev/null
    mountDiskPart "$STORAGE_UUID" '/storage/usbdisk1' || return 1
    mountDiskPart "$CF_UUID" '/cf' || return 1
}

# Executes the pbx_firmware update from the current script directory
executeFirmwareUpdate() {
    local systemDevice=$(lsblk -o UUID,PKNAME | grep "$CF_UUID" | cut -d ' ' -f 2)
    if [ -b "/dev/${systemDevice}" ]; then
      mkdir -p /var/etc
      echo '/storage/usbdisk1' > /var/etc/storage_device
      echo "$systemDevice" > /var/etc/cfdevice
      /bin/bash pbx_firmware "$UPDATE_IMG_FILE" "$systemDevice"
    else
      echo ' - System disk not found...'
      return 1
    fi
}

# Starts the upgrade process
startUpgrade() {
    local updateVersion="version"
    if [ -f "$updateVersion" ]; then
      local versionNumber=$(cat "$updateVersion")
      echo " - Starting upgrade to the version: $versionNumber..."
    else
      echo " - Starting upgrade..."
    fi

    mountPartitions && executeFirmwareUpdate
}

# Start the upgrade process
startUpgrade