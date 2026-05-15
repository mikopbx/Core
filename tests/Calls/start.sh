#
# Copyright © MIKO LLC - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential
# Written by Alexey Portnov, 10 2020
#

function echo_header() {
    echo -e "\e[01;35m${1}\e[0m";
}

function echo_info() {
    echo -e "\e[01;32m-> \e[0m${1}";
}

function echo_error() {
    echo -e "\e[01;31m-> ERROR: ${1}\e[0m" >&2;
}

# Глобальные переменные для cleanup
dirName="$(realpath "$(dirname "$0")")";
dumpConfFile='/storage/usbdisk1/mikopbx/tmp/mikopbx.db';
confFile='/cf/conf/mikopbx.db';
testConfFile="$dirName/db/mikopbx.db";
astConf="${dirName}/asterisk/asterisk.conf";
debugParams="$XDEBUG_CONFIG";
didSwapDb="false";
testsFailed=0;

function cleanup() {
    echo_header "Cleaning up...";

    # Останавливаем тестовый Asterisk если запущен
    local pidFile="${dirName}/run/asterisk.pid";
    if [ -f "$pidFile" ]; then
        /usr/sbin/asterisk -C "$astConf" -rx 'core stop now' > /dev/null 2>/dev/null;
    fi

    # Восстанавливаем production базу данных
    if [ "$didSwapDb" = "true" ] && [ -f "$dumpConfFile" ]; then
        echo_info "Stopping services holding the DB...";
        # Stop only the services that hold mikopbx.db open. NEVER call `monit stop all`:
        # it brings down dropbear/sshd and locks the host out of remote access.
        monit stop asterisk > /dev/null 2>&1 || true;
        monit stop php-fpm  > /dev/null 2>&1 || true;

        # Wait up to ~30s for processes to release the DB.
        local i;
        for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
            if [ -z "$(lsof "$confFile" 2>/dev/null | awk 'NR>1')" ]; then
                break;
            fi
            sleep 2;
        done

        # Force-kill any stragglers (PHP workers outside monit). Never touches the SSH session.
        local stragglers;
        stragglers=$(lsof "$confFile" 2>/dev/null | awk 'NR>1 {print $2}' | sort -u);
        if [ -n "$stragglers" ]; then
            echo "$stragglers" | xargs -r kill -TERM 2>/dev/null || true;
            sleep 2;
            stragglers=$(lsof "$confFile" 2>/dev/null | awk 'NR>1 {print $2}' | sort -u);
            [ -n "$stragglers" ] && echo "$stragglers" | xargs -r kill -KILL 2>/dev/null || true;
        fi

        echo_info "Restoring production database...";
        # Remove stale WAL/SHM from the test DB BEFORE cp.
        # Otherwise SQLite will replay the old WAL on top of the restored file and the DB
        # ends up "malformed" — exactly the corruption we observed before this fix.
        rm -f "${confFile}-wal" "${confFile}-shm";
        cp "$dumpConfFile" "$confFile";
        sync;

        if [ "${debugParams}x" != "x" ]; then
            export XDEBUG_CONFIG="${EMPTY}";
        fi;
        php -f "$dirName/db/updateDb.php" > /dev/null 2>/dev/null;
        iptables -F 2>/dev/null; iptables -X 2>/dev/null;
        export XDEBUG_CONFIG="${debugParams}";

        # Bring services back via monit, named (not `start all`) — see comment above.
        monit start php-fpm  > /dev/null 2>&1 || true;
        monit start asterisk > /dev/null 2>&1 || true;
    fi
}
trap cleanup EXIT INT TERM

echo_header 'Init asterisk...';
/bin/busybox mount -o remount,rw /offload/

############################################################
##### Setup configs
echo_header 'Setup configs...';
cp "$confFile" "$dumpConfFile"

if [ "${debugParams}x" != "x" ]; then
  export XDEBUG_CONFIG="${EMPTY}";
fi;

if [ "${1}x" = 'x' ]; then
  echo_info "Copy tests config...";
  # Copy m_LanInterfaces from production to test DB using only columns present in test DB.
  # This handles schema differences when production has newer columns (e.g. IPv6 fields).
  # Safe: testCols derived from pragma_table_info (trusted schema), not user input.
  testCols=$(sqlite3 "$testConfFile" "PRAGMA table_info(m_LanInterfaces);" | cut -d'|' -f2 | tr '\n' ',' | sed 's/,$//')
  sqlite3 "$testConfFile" "
    ATTACH DATABASE '${dumpConfFile}' AS prod;
    DELETE FROM main.m_LanInterfaces;
    INSERT INTO main.m_LanInterfaces(${testCols}) SELECT ${testCols} FROM prod.m_LanInterfaces;
    DETACH DATABASE prod;
  "
  rm -rf "$confFile"*;
  cp "$testConfFile" "$confFile";
  # Disable firewall and fail2ban in test DB — they block SIP registration and SSH access
  sqlite3 "$confFile" "
    UPDATE m_PbxSettings SET value='0' WHERE key='PBXFirewallEnabled';
    UPDATE m_PbxSettings SET value='0' WHERE key='PBXFail2BanEnabled';
  "
  didSwapDb="true";
  echo_info 'Clear redis...';
  /usr/bin/redis-cli FLUSHALL > /dev/null 2> /dev/null;
  echo_info 'Restart services and update test db...';
  php -f "$dirName/db/updateDb.php";
  # Flush firewall rules — test DB may have restrictive iptables that block SIP/SSH
  iptables -F 2>/dev/null; iptables -X 2>/dev/null;
  sleep 5;
  echo_info 'Wait booted asterisk...';
  asterisk -rx 'core waitfullybooted' > /dev/null 2> /dev/null;
fi;
############################################################

pidFile="${dirName}/run/asterisk.pid";
if [ -f "$pidFile" ]; then
  kill "$(cat "$pidFile")" 2>/dev/null;
fi;

# Создаем новый asterisk.conf исходя из директории тестового скрипта.
escapeDirName=$(echo "$dirName" | sed "s/\//\\\\\//g");
sed "s/PATH/$escapeDirName/" < "${dirName}/asterisk/asterisk-pattern.conf" > "${dirName}/asterisk/asterisk.conf"

# Запускаем тестовый Asterisk.
echo_info "New config file $astConf...";
/usr/sbin/asterisk -C "$astConf";
echo_info "Waiting start asterisk...";
sleep 1;
echo_info "Waiting fully boot asterisk...";
/usr/sbin/asterisk -C "$astConf" -rx 'core waitfullybooted' > /dev/null;
echo_info 'End init';
echo;

export USER_AGENT="mikopbx-test-$(date +'%s')";
export astConf dirName;
initTests=$(/bin/find "${dirName}/Scripts" -type f -name "start.php" | /bin/sort | grep '/00-');

export XDEBUG_CONFIG="${debugParams}";
if [ "$1" != '' ]; then
  tests=$(/bin/find "${dirName}/Scripts" -type f -name "start.php" | /bin/sort | grep -v '/00-' | grep "/${1}");
else
  tests=$(/bin/find "${dirName}/Scripts" -type f -name "start.php" | /bin/sort | grep -v '/00-');
fi

tests="$initTests $tests"
for file in $tests; do
  /usr/bin/timeout 300 /usr/bin/php -f "${file}";
  exitCode=$?;
  if [ $exitCode -ne 0 ]; then
    echo_error "Test FAILED (exit code $exitCode): $file";
    testsFailed=$((testsFailed + 1));
  fi
done

if [ ! "${2}x" == "x" ]; then
  echo_info "Need sleep ${2}";
  sleep "${2}";
fi;

# cleanup выполнится автоматически через trap EXIT

if [ $testsFailed -gt 0 ]; then
  echo_error "$testsFailed test(s) failed";
  exit 1;
fi
############################################################
