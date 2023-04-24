/*
GPS Data Server
Copyright Stefano Cudini 2013
*/
var  sys = require('util')
	//,path = require('path')
	,http = require('http')
	,net = require('net')
	,fs = require('fs')
	,conf = JSON.parse( fs.readFileSync('./conf.json') );

conf.AuthKey = (new Buffer(conf.putuser+':'+conf.putpass)).toString('base64');

function logdate() {
	var d = new Date(),
		T = {Y: d.getFullYear(), M: d.getMonth()+1, D: d.getDate(),
			 h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
	for(t in T)
		T[t] = T[t]>9 ? T[t] : '0'+T[t];
	return '['+ [T.D,T.M,T.Y].join('-')+' '+[T.h,T.m,T.s].join(':') +'] ';
}

function logga(text) {
	console.log(logdate(), text);
}

function PostData(postData) {

	var postOpts = {
		host: conf.posthost,
		path: conf.postpath,		
		port: conf.postport,
		method: 'POST',
		headers: {
			'Host': conf.posthost,
			'Connection: ': 'Close',
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
			/*
			Keep-Alive: 120  //da usare quando la connessione sarà keep-alive
			User-Agent: PIC18F
			*/
		}
	};

	var postReq = http.request(postOpts, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			logga('post response ok');
		});
	});

	postReq.on('error', function(e) {
		logga('post error: '+e);
	});

	postReq.write( postData );
	postReq.end();
}


var server = net.createServer(function (socket) {	//server socket che ricevere gli url visitati
	socket.setEncoding('utf8');
	socket.on('connect', function(data) {
		logga('device connected: '+socket.remoteAddress+':'+socket.remotePort);
	});
	socket.on('data', function(data) {
		logga("\tdevice data: "+ data +"\n");

		//TODO parser headers

		//TODO autenticazione: http://evertpot.com/223/
		//if( Authorization: Basic ... != conf.AuthKey)
		if(false)
		{
			var heads = 
				"HTTP/1.1 401 Authorization Required"+"\r\n"+
				"Date: "+(new Date()).toGMTString()+"\r\n"+
				"Server: Apache"+"\r\n"+
				"WWW-Authenticate: Basic realm=\"Device Auth\""+"\r\n"+
				//"Last-Modified: "+(new Date()).toGMTString()+"\r\n"+
				"Content-Length: 0"+"\r\n"+
				"Keep-Alive: timeout=20000, max=100"+"\r\n"+
				"Connection: Keep-Alive"+"\r\n"+
				//"Connection: Close"+"\r\n"+
				"\r\n";
			socket.write(heads);
			socket.end();
		}

		//TODO queue post data

		//TODO invia i dati al db
		PostData(data);
		
	});
	socket.on('end', function(data) {
		logga('\tdevice end: '+data +"\n");//['+socket.remoteAddress+']');
	});
	socket.on('close', function() {
		logga('device disconnect');//['+socket.remoteAddress+']');
	});
	socket.on('error', function(e) {
		logga('device error: '+e);
	});
});

server.listen(conf.putport, conf.putbind, function() {
	logga('server listen: '+ conf.putbind +':'+ conf.putport );
});


