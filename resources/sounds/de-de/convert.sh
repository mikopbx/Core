#!/bin/bash
wav_file=$1
gsm_file=${1/.ulaw/.gsm}
if [ $# -ne 1 ]; then
    echo "Usage: $0 filename.ulaw"
    exit
fi
if [ ! -f $wav_file ]; then
    echo "ULAW file is missing"
    exit 1
fi
if [ -f $gsm_file ]; then
    echo -en "The destination file $gsm_file is existing\nDo you want to remove it(Y/N): "
    read ans
    if [[ "$ans" =~ /Yy/ ]]; then
            rm -f $gsm_file
    fi
fi
sox -t ulaw $wav_file -r 8000 -c1 -t gsm $gsm_file resample -ql
