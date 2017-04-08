var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var pg = require('pg');
var first_login = true;
app.use(express.static('public'));
var config = "postgres://dron:1111@127.0.0.1:5432/default_chat_dron_db";
var users = [];
var messages = [];

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

  console.log("Connected");

  socket.on('user changed', function (username) {
    console.log(username);
    first_login = true;
    pg.connect(config, function (err, client, done) {
      client.query("select * from users where name=$1", [username], function (err, result) {

        if (result.rowCount < 1) {
          console.log("Нема в бд!");
          client.query("insert into users(name) values($1)", [username], function (err, result) {
            socket.username = username;
            if (users.indexOf(socket.username) == -1)
              users.push(username);
            io.emit('user changed', {users: users});
            first_login = false;
          })
        }
        else {
          if(first_login == true)
          {
            var my_obj;
            client.query("select * from users where name=$1", [username], function (err, result) {
                client.query("select * from messages where id_user=$1", [result.rows[0].id], function (err, result) {
                  for(var i = 0;i<result.rowCount;i++){
                    my_obj = {from: "HISTORY: " + socket.username, message: result.rows[i].message};
                    socket.emit('send message', my_obj);
                  }
                })
            })
            first_login= false;
          }
          else {

            first_login = true;
          }
          socket.username = username;
          if (users.indexOf(socket.username) == -1)
            users.push(username);
          io.emit('user changed', {users: users});
        }
      })
    })

  })



  socket.on('disconnect', function () {
    console.log("Disconnected");
    users.splice(users.indexOf(socket.username), 1);
    io.emit('user changed', {users: users});
    first_login = true;
    delete socket.username;
  });

  socket.on('send message', function (obj) {
    pg.connect(config, function (err, client, done) {
      client.query("select id from users where name=$1", [socket.username], function (err, result) {
        console.log();
        client.query("insert into messages(id_user, message) values($1, $2)", [result.rows[0].id, obj.message], function (err, result) {
        })
      })
    })
    socket.broadcast.emit('send message', obj);
  });

});
server.listen(3000, function () {
  console.log("Server started on port 3000.");
});
