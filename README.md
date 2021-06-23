## Commands
Run this command to stream the terminal to the server:

```
exec &> >(tee /dev/tty | nc localhost 1337)
```


In a separate terminal, run this command to stream audio:

```
arecord -f cd -t raw | oggenc -r -q 0 - | nc localhost 1338
```
For the above command, you will need to install `vorbis-tools` and `netcat`.

## Other options

```
#pipe just stdout to the server
exec > >(tee /dev/tty | nc localhost 1337)

#run bash and pipe its stdout to the server
bash | tee /dev/tty | nc localhost 1337

#pipe everything in the current terminal to the server
exec &> >(tee /dev/tty | nc localhost 1337)
# https://unix.stackexchange.com/questions/634350/understanding-exec-command
# this one causes resizing issues with nethack


#wav audio, 8000 Hz
arecord | nc localhost 1338

#wav audio, 44100 Hz
arecord -f cd -t raw | nc localhost 1338


#ogg audio, 44100 Hz compressed 😀️
arecord -f cd -t raw | oggenc -r -q 0 - | nc localhost 1338
#arecord opts:
# -f cd (16 bit little endian, 44100, stereo)
# -t, --file-type TYPE    file type (voc, wav, raw or au)
#oggenc opts:
# -r, --raw            Raw mode. Input files are read directly as PCM data
# -q, --quality        Specify quality, between -1 (very low) and 10 (very
#                      high), instead of specifying a particular bitrate.
#                      This is the normal mode of operation.
#                      Fractional qualities (e.g. 2.75) are permitted
#                      The default quality level is 3.
```
