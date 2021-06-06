var socket = io();
socket.on('chat message', function(msg) {
  var messages = document.getElementById('messages');
  var newLi = document.createElement("li");
  messages.appendChild(newLi);
  newLi.appendChild(document.createTextNode(msg.name+": "+msg.text));

  //scroll to the most recent message
  messages.scrollTop = messages.scrollHeight;
});

document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  var text = document.getElementById('m').value;
  if (text != '') {
    var name = document.getElementById('name').value;
    socket.emit('chat message', {"name": name, "text": text});
  }
  document.getElementById('m').value = '';
  return false;
});

