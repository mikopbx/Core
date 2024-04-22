#!/bin/sh

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
    echoToTeletype " - Storage disk with UUID=${uuid} not found..."
    exit 1;
  fi

  mkdir -p "$mountpoint";
  mount -rw UUID="$uuid" "$mountpoint" 2> /dev/null;
  MOUNT_RESULT=$?;
  if [ ! "${MOUNT_RESULT}" = "0" ] ; then
    echoToTeletype " - Fail mount storage with UUID=${uuid} to ${mountpoint} ..."
    exit 1;
  fi
}

# echoToTeletype: Prints a message to the console and the serial port if available.
# Args:
#   $1: Message to be printed.
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
      /bin/sh pbx_firmware "$UPDATE_IMG_FILE" "$systemDevice"
    else
      echoToTeletype ' - System disk not found...'
      return 1
    fi
}

# Starts the upgrade process
startUpgrade() {
    local updateVersion="version"
    if [ -f "$updateVersion" ]; then
      local versionNumber=$(cat "$updateVersion")
      echoToTeletype " - Start update script with version $versionNumber..."
    else
      echoToTeletype " - Start update script without version information..."
    fi

    mountPartitions && executeFirmwareUpdate
}

# Start the upgrade process
startUpgrade