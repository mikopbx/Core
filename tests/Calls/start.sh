#
# Copyright © MIKO LLC - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential
# Written by Alexey Portnov, 10 2020
#

# sh /root/mikopbx-testing/start.sh
#

echo -e "\e[01;35mInit asterisk...\e[0m";

dirName=$(dirname "$0");
pidDir="${dirName}/run/asterisk.pid";
if [ -f "$pidDir" ]; then
  # Убиваем старый процесс.
  kill "$(cat "$pidDir")";
fi

# Создаем новый asterisk.conf исходя из директории тестового скрипта.
escapeDirName=$(echo "$dirName" | sed "s/\//\\\\\//g");
sed "s/PATH/$escapeDirName/" < "${dirName}/asterisk/asterisk-pattern.conf" > "${dirName}/asterisk/asterisk.conf"

# start asterisk.
astConf="${dirName}/asterisk/asterisk.conf";
asterisk -C "$astConf";
echo -e "\e[01;32m-> \e[0mWaiting start asterisk...";
sleep 1;
# Ожидаем запуска Asterisk.
asterisk -C "$astConf" -rx 'core waitfullybooted' > /dev/null;
echo -e "\e[01;32m-> \e[0mWaiting fully boot asterisk...";
echo;
# Ждем регистрации.
sleep 3;
# Выполнение теста. Originate через AMI.

export astConf dirName;
tests=$(find "${dirName}/Scripts" -type f -name "start.php" | sort);
for file in $tests
do
  php -f "${file}";
done

