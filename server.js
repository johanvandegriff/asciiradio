const express = require('express');
const app = express();
const http = require('http');
const web_server = http.createServer(app);
const io = require("socket.io")(web_server);
const net = require('net');
const dotenv = require('dotenv'); //for storing secrets in an env file

var DEFAULT_WEB_PORT = 8080;
var DEFAULT_TERMINAL_PORT = 1337;
var DEFAULT_AUDIO_PORT = 1338;

//options: "wav"
//         "mpeg" (mp3) (not implemented)
//         "ogg" (not implemented)
var AUDIO_FORMAT = "ogg";

var web_port = process.env.WEB_PORT || DEFAULT_WEB_PORT;
var terminal_port = process.env.TERMINAL_PORT || DEFAULT_TERMINAL_PORT;
var audio_port = process.env.AUDIO_PORT || DEFAULT_AUDIO_PORT;


app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html') });
app.get('/style.css', (req, res) => { res.sendFile(__dirname + '/style.css') });

//expose js libraries to client so they can run in the browser
app.get('/xterm.css', (req, res) => { res.sendFile(__dirname + '/node_modules/xterm/css/xterm.css') });
app.get('/xterm.js', (req, res) => { res.sendFile(__dirname + '/node_modules/xterm/lib/xterm.js') });
app.get('/xterm.js.map', (req, res) => { res.sendFile(__dirname + '/node_modules/xterm/lib/xterm.js.map') });

//start the http server
web_server.listen(web_port, () => {
    console.log('web server listening on port', web_port);
});



// BEGIN TERMINAL SERVER
var allTerminalData = "";

//use socket.io to send terminal data
io.on('connection', (socket) => {
    console.log('client connected to terminal data, sending backlog');
    if (allTerminalData.length > 0) {
        //send the backlog of data just to this client to prevent a partially rendered screen
        socket.emit('terminal', allTerminalData);
    }
    socket.on('disconnect', () => {
        console.log('client disconnected from terminal data');
    });

    //chatroom
    socket.on('chat message', (msg) => {
        console.log('message:', msg.name, 'text:', msg.text);
        io.emit('chat message', {'name': msg.name, 'text': msg.text});
    });
});

// https://riptutorial.com/node-js/example/22405/a-simple-tcp-server

const terminal_server = net.createServer();
terminal_server.listen(terminal_port, () => {
    console.log('terminal server listening on port', terminal_port);
});

terminal_server.on('connection', function (socket) {
    console.log('the streamer connected to the terminal server');
    socket.write('Hello, terminal client.\n');

    socket.on('data', function (chunk) {
        data = chunk.toString();
        console.log('terminal data received from the streamer, length:', data.length);
        io.emit('terminal', data); //send to the web clients to display in the terminal
        allTerminalData += data; //save all the terminal data for new clients
    });

    socket.on('end', function () {
        console.log('closing terminal connection with the streamer');
    });

    socket.on('error', function (err) {
        console.log('error:', err);
    });
});
// END TERMINAL SERVER





// BEGIN AUDIO SERVER
// https://en.wikipedia.org/wiki/Ogg#Page_structure
var OGG_SEP = "OggS";
var OGG_SEP_BUF = Buffer.from(OGG_SEP);
var NUM_OGG_HEADER_CHUKNS = 2;
var oggHeaderChunks = [];
var oggData = Buffer.alloc(0); //empty buffer

function findOggSep(chunk) {
    matches = [];
    for (i=0; i<chunk.length; i++) {
        found = true;
        for (j=0; j<OGG_SEP_BUF.length; j++) {
            if (chunk[i+j] != OGG_SEP_BUF[j]) {
                found = false;
                break;
            }
        }
        if (found) {
            matches.push(i);
        }
    }
    return matches;
}

function sendAudioToClients(chunk) {
    console.log('number of clients to send to:', clients.length);
    if (clients.length > 0){
       for (clientIdx in clients){
           clients[clientIdx].write(chunk);
       };
    }
//    console.log('chunk', chunk.toString());
}

var clients = [];

const audio_server = net.createServer();
audio_server.listen(audio_port, () => {
    console.log('audio server listening on port', audio_port);
});

audio_server.on('connection', function (socket) {
    console.log('the streamer connected to the audio server');
    socket.write('Hello, audio client.\n');

    socket.on('data', function (chunk) {
        //chunk is a Buffer object
        console.log('audio received from the streamer, length:', chunk.length);
//        console.log('audio received from the streamer:', chunk); //.toString());
        if (AUDIO_FORMAT == "wav") sendAudioToClients(chunk)
        if (AUDIO_FORMAT == "ogg") {
            oggData = Buffer.concat([oggData, chunk]);
            console.log('oggData.length', oggData.length);
            matches = findOggSep(oggData);
//            matches = [...oggData.toString().matchAll(OGG_SEP)]
            console.log('matches', matches);
            while (matches.length >= 2) {
                idx1 = matches[0]; //.index;
                idx2 = matches[1]; //.index;
                slice1 = oggData.slice(0,idx1);
//                slice2 = oggData.slice(idx1+OGG_SEP.length,idx2);
                slice2 = oggData.slice(idx1,idx2);
                slice3 = oggData.slice(idx2,oggData.length);

                console.log('junk data:', slice1);
                oneChunk = slice2;
                oggData = slice3; //save the left-over for next time

                console.log('oggHeaderChunks.length', oggHeaderChunks.length)

                if (oggHeaderChunks.length < NUM_OGG_HEADER_CHUKNS) {
                    oggHeaderChunks.push(oneChunk);
                }
                sendAudioToClients(oneChunk);
                matches = findOggSep(oggData);
            }
        }
    });

    socket.on('end', function () {
        console.log('closing audio connection with the streamer');
    });

    socket.on('error', function (err) {
        console.log('error:', err);
    });
});

//https://docs.fileformat.com/audio/wav/

//wav file header for 8000 Hz sample rate
//var wavHeader = Buffer.from([
//0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x80, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
//0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00,
//0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x01, 0x00
//]);

//wav file header for 44100 Hz sample rate
var wavHeader = Buffer.from([
0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x80, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x44, 0xac, 0x00, 0x00, 0x10, 0xb1, 0x02, 0x00,
0x04, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x01, 0x00
]);


app.get('/audio', function(req, res){
    res.writeHead(200,{
      "Content-Type": "audio/"+AUDIO_FORMAT,
      'Transfer-Encoding': 'chunked'
    });
    // Add the response to the clients array to receive streaming
    clients.push(res);
    if (AUDIO_FORMAT == "wav") {
      //start the client with the wav header even when joining part-way thru
      res.write(wavHeader)
    }
    if (AUDIO_FORMAT == "ogg") {
        for (chunkIdx in oggHeaderChunks) {
            console.log('sending ogg header chunk');
            res.write(oggHeaderChunks[chunkIdx]);
        }
    }
    console.log('client connected to audio data, sending audio stream'); 
});

// END AUDIO SERVER



//TODO remove audio users from clients list when disconnected
//TODO autoplay while muted not working
//TODO add delay to terminal to match audio
//TODO customize audio tag with css https://blogs.perficient.com/2017/12/19/how-to-customize-your-own-html5-audio-player/
//TODO pick a domain name
//TODO deploy to full domain
//TODO multi-user support




