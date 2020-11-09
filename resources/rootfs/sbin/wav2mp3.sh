#!/bin/sh
# $1 - filename without extension
srcFile="${1}.wav";
srcIn="${1}_in.wav";
srcOut="${1}_out.wav";
dstFile="${1}.mp3";

exitCode=0;

if [ -f "$srcIn" ] && [ -f "$srcOut" ]; then
  # Stereo mode.
  dstWavFile="${1}.wav";
  /usr/bin/sox -M "$srcIn" "$srcOut" "$dstWavFile";
  resultSox="$?";
  if [ "$resultSox" = '0' ]; then
    /usr/sbin/mv "$dstWavFile" "$srcFile";
  else
    # Cancel stereo mode.
    echo "Fail convert to stereo file.";
    exitCode=4;
  fi
elif [ ! -f "$srcFile" ]; then
  echo "Src file not found.";
  exit 1;
fi

/usr/bin/lame -b 32 --silent "$srcFile" "$dstFile" && /bin/chmod o+r "$dstFile";
/usr/bin/soxi "$dstFile"  > /dev/null 2> /dev/null;
resultSoxi="$?";
if [ "$resultSoxi" = '0' ]; then
  /usr/sbin/rm -rf "$srcFile" "$srcIn" "$srcOut";
else
  # Error convert to result file.
  exitCode=3;
fi

exit "$exitCode";