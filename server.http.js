/*
GPS Data Server
Copyright Stefano Cudini 2013
*/
//TODO https://github.com/joyent/node/issues/7666

var sys = require('util')
	,http = require('http')
	//,qs = require('querystring')
	,net = require('net')
	,fs = require('fs')
	,spawn = require('child_process').spawn;

var conf = JSON.parse( fs.readFileSync(process.argv[2] || './conf.json') );
conf.token = (new Buffer(conf.putuser+':'+conf.putpass)).toString('base64');

var clientQueue = {};	//coda client connessi

var logger = function() {

	function commonlog(text) {
		console.log(logdate()+ text);
	}

	var logStreams = {};

	for(var type in conf.logsfile)
	{
		if(conf.logsfile[type])
			logStreams[type] = fs.createWriteStream(conf.logsfile[type], {flags: 'a', mode: 0770})
							.on('error',function(e) {
								commonlog('logger '+e+' '+conf.logsfile[type]);
							});
	}
	
	function logdate() {
		var d = new Date(),
			T = {Y: d.getFullYear(), M: d.getMonth()+1, D: d.getDate(),
				 h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
		for(t in T)
			T[t] = T[t]>9 ? T[t] : '0'+T[t];
		return '['+ [T.D,T.M,T.Y].join('-')+' '+[T.h,T.m,T.s].join(':') +'] ';
	}

	return {
		server: function(text) {
			commonlog(text);
			logStreams.server.write(logdate()+ text +"\n");
		},
		packets: function(text) {
			commonlog(text);
			if(conf.logpackets)
				logStreams.packets.write(logdate()+ text +"\n");
		},
		auth: function(text) {
			commonlog(text);
			logStreams.auth.write(logdate()+ text +"\n");
		}
	};
}();

function parseHttp(postData, reqIp) {	//invia dati in HTTP POST al php
	//HTTP multipart upload: http://goo.gl/BQpHk
	//http://stackoverflow.com/questions/4295782/how-do-you-extract-post-data-in-node-js

	var postOpts = {
		host: conf.parser.host,
		port: conf.parser.port,		
		path: conf.parser.path,
		method: 'POST',
		headers: {
			'Host': conf.parser.host,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length,
			'Connection': 'Close',	//per adesso chiude subito
			//'Keep-Alive': 10,	//TODO da usare quando la connessione verso il php e' keep-alive
			//'Connection': 'Keep-alive',
			//'User-Agent': 'GPS Data Server'
		}
	};

	var tstart = new Date();
	http.request(postOpts, function(resp) {
			//TODO set timeout
			if(resp.statusCode!='200')
				logger.server('['+reqIp+'] parser http error: http://'+conf.parser.host+':'+conf.parser.port+conf.parser.path+' '+
									resp.statusCode+' '+http.STATUS_CODES[resp.statusCode]);
			else
				logger.packets('['+reqIp+'] parser response: '+ resp.statusCode +' in '+ (new Date() - tstart) +'ms');
			// resp.setEncoding('utf8');
			// resp.on('data', function (body) {
			// 	logger.packets('['+reqIp+'] post response: '+body);
			// });
		})
		.on('error', function(e) {
			logger.server('['+reqIp+'] parser connection error: '+e);
		})
		.end(postData);
}

function parseCli(postData, reqIp) {	//invia dati via CLI al php

	var tstart = new Date();

	var php = spawn(conf.parser.bin, conf.parser.args);
	php.stdout.resume();
	php.stderr.resume();
	//php.stdout.pipe(process.stdout);

//TODO memory monitor: https://github.com/joyent/node/issues/7666
//gc && gc();
//console.log('memory usage: ',process.memoryUsage());

	// php.stdout.on('data', function(buf) {
	// 	console.log( '['+ buf.toString('utf8') +']' );
	// });
	php.on('exit', function(resp) {
		//TODO set timeout
		if(resp !== 0)
			logger.server('['+reqIp+'] parser cli error: '+conf.parser.bin+' '+conf.parser.args.join(' ') );
		else
			logger.packets('['+reqIp+'] parser cli response: '+ resp +' in '+ (new Date() - tstart) +'ms');
	})
	.on('error', function(err) {
		logger.server('['+reqIp+'] parser cli error: '+err);
	});
	//php.stdin.write(postData);
	php.stdin.end(postData);
}

var server = http.createServer(function(req, resp) {

	var reqIp = req.socket.remoteAddress,
		userAgent = (req.headers['user-agent']||''),
		board = (userAgent.indexOf('_')<0 ? '' : userAgent.split('_').pop());

	logger.auth('['+reqIp+'] auth request: '+'"'+req.method+' '+req.url+' HTTP/'+req.httpVersion+'" "'+userAgent+'"');

	var header = req.headers['authorization'] || '',
		token = header.split(/\s+/).pop() || '',
		auth = new Buffer(token, 'base64').toString(),
		parts = auth.split(/:/),
		user = parts[0],
		pass = parts[1];

	if(token != conf.token )	//chiude connessioni non autenticate
	{
		resp.writeHead('401','Authorization Required', {
			//'Date': (new Date()).toGMTString(),
			'Server': 'Apache',
			'WWW-Authenticate': 'Basic realm="Device Auth"',
			'Last-Modified': (new Date()).toGMTString(),
			'Content-Length': 12,
			'Content-Type': 'text/plain',
			//'Keep-Alive': 'timeout=15, max=100',
			//'Connection': 'Keep-Alive',
			'Connection': 'Close'
		});
		resp.end('Require Auth');
		//TODO req.abort();
		req.connection.destroy();
		//req.socket.destroy();
		logger.auth('['+reqIp+'] login error: '+ user);
		return false;			
 	}
	else if(!board || !conf.putboards[board])
	{
		resp.writeHead('403','Forbidden', {
			//'Date': (new Date()).toGMTString(),
			'Server': 'Apache',
			'Last-Modified': (new Date()).toGMTString(),
			'Content-Length': 14,
			'Content-Type': 'text/plain',
			//'Keep-Alive': 'timeout=15, max=100',
			//'Connection': 'Keep-Alive',
			'Connection': 'Close'
		});
		resp.end('Board Disabled');
		//TODO req.abort();
		req.connection.destroy();
		//req.socket.destroy();
		//logger.auth('['+reqIp+'] board disabled, user-agent: '+userAgent);
		return false;
	}
	else
		logger.auth('['+reqIp+'] logged: '+ userAgent);

/*	if(!clientQueue[board])
		clientQueue[board] = {
			ip: reqIp,
			//req: req,
			packets: []
		};
*/	// else{
	// 	clientQueue[board].req.connection.destroy();
	// 	console.log(cl);
	// }	

	//Se autenticato continua a ricevere dati

//NON INVIARE! senno il client chiude e non manda piu pacchetti!
/*	resp.writeHead('200', {
		//'Server': 'Apache',
		'Date': (new Date()).toGMTString(),
		'Content-Length': 2,
		'Content-Type': 'text/html',
		'Keep-Alive': 'timeout='+conf.puttimeo+', max=2000',
		'Connection': 'Keep-Alive',
		//'Connection': 'Close'
	});
	resp.end('OK');
*/
	req.setEncoding('utf8');	//senza di questo legge dati binari	

	req.on('data', function(data) {		
		/*
		Event: 'data'#
		Emitted when a piece of the message body is received.
		The chunk is a string if an encoding has been set with request.setEncoding(), 
		otherwise it's a Buffer.
		*/
		logger.packets('['+reqIp+'] board: '+ board +', data length: '+ data.length);

//		clientQueue[board].packets.push(data);

//		console.info('On Data:');
//		console.log({board: board, QueueLen: clientQueue[board].packets.length});

		//parseHttp(data, reqIp);
		parseCli(data, reqIp);

/*		if(clientQueue[board].packets.length >= conf.putlenbuf)
		{
			//postData(data,req);
			console.info('Post Data:')
			console.log(clientQueue[board].packets);
			clientQueue[board].packets = [];	//svuota coda
		}*/
	});
	req.on('close', function() {
		logger.server('['+reqIp+'] close connection!');

		req.connection.destroy();
		//TODO destroy socket
	});	
});

server.timeout = conf.puttimeo;
server.maxHeadersCount = 12;

server.on('timeout', function() {
	logger.server('connection timeout!');
});
//maxconn http://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback

server.on('close', function() {
	logger.server('server stop');
});

server.listen(conf.putport, conf.putbind, conf.maxconn, function() {
	logger.server('server start: '+ conf.putbind +':'+ conf.putport +' timeout: '+server.timeout+'ms');
});

//http://blog.nodejitsu.com/keep-a-nodejs-server-up-with-forever

//setInterval(function () {
// 	console.log(clientQueue);
// // console.log('Throwing error now.');
// // throw new Error('User generated fault.');
//}, 10000);

//*/
