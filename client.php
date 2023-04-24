#!/usr/bin/env php
<?php

set_time_limit(0);
ini_set("default_socket_timeout", 6000);

function getDATA() {
	#return 'data='.randString( rand(200,300) );
	return file_get_contents('data.sample.packet');
}

$conf = json_decode(file_get_contents('conf.json'),true);
list($host, $port) = isset($argv[2]) ? explode(':',$argv[2]) : array($conf['putbind'],$conf['putport']);

$BOARDS = array('0001','0002','0003','9999');

while(1):
	unset($sock);
	$sock = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);

	$timeout = array('sec'=>2,'usec'=>0);
	socket_set_option($sock,SOL_SOCKET,SO_RCVTIMEO, $timeout);

	$res = socket_connect($sock, $host, (int)$port);

	if($res===false) {
		echo "Unable to connect to $host:$port\n";
		sleep(1);
		continue;
	}

	$BOARDID = $BOARDS[array_rand($BOARDS)];

	$head = "POST / HTTP/1.1"."\r\n".
			"Host: ".$host."\r\n".
			"Content-Type: application/x-www-form-urlencoded"."\r\n".
			"User-Agent: CLIENTPHP_".$BOARDID."\r\n".
			"Connection: keep-alive"."\r\n".
			"Authorization: Basic ".base64_encode($conf['putuser'].':'.$conf['putpass'])."\r\n".
			"Content-Length: 10000000"."\r\n".
			//"Content-Length: 500"."\r\n".
			//'Content-Length: '.strlen(getDATA())."\r\n".
			"\r\n"."\r\n";
			// !!! questo content-length rappresenta la lunghezza totale dei pacchetti accettati
	$headShort = '';
				// 'POST / HTTP/1.1'."\r\n".
				// 'Connection: keep-alive'."\r\n".
				// 'Content-Length: '.strlen(getDATA())."\r\n".
				// "\r\n"."\r\n";
		
	$interval = 100000;
	$first = true;
	$maxpackets = 5000;
	while($maxpackets--)
	{
		echo "\n\n[CLIENT ".date('H:i:s ').', BOARD: '.$BOARDID.", Interval: $interval]:\n";
		echo $out = ($first ? $head : $headShort).getDATA();

		if($first) {
			$first = false;
			// echo "\n[SERVER]:\n";
			// while(!feof($sock)) //stampa tutta la risposta del server
			// 	echo fread($sock, 200);
			//inutile xke il server manda output solo in caso il client non sia auteticato
		}
		
		if(socket_write($sock, $out)===false)//$out.chr(0)
		{
			echo "\ndisconnected!";
			break;
		}

		// if($maxpackets<496)	//aumenta intervallo dopo qualche pacchetto per testare timeout
		// 	$interval = 10;
		usleep($interval);
	}
	socket_close($sock);
	sleep(2);
endwhile;


function randString($length = 10) {
    $characters = '0123456789ABCDEF,*.)';
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $randomString;
}

?>