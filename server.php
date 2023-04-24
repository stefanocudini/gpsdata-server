<?php

set_time_limit(0);

list($host, $port) = !isset($argv[1]) ? array('0.0.0.0',9900) : explode(':',$argv[1]);

$socket = socket_create(AF_INET, SOCK_STREAM, 0) or die("Could not create socket\n");
$result = socket_bind($socket, $host, $port) or die("Could not bind to socket\n");

$result = socket_listen($socket, 3) or die("C'e' qualche altro programma in ascolta su sta porta\n");

echo "LISTEN: $host:$port";
//HTTP AUTH:
//http://www.disi.unige.it/person/ReggioG/RETI01WWW/LEZIONI/Appunti2/Cap2a/Cap2a.html
$flog = fopen('server.php.log','a+');
while(1)
{
	$spawn = socket_accept($socket);

	echo "DEVICE CONNECTED\n"; //TODO ip o id device

	while(1)
	{
		try {
			$input = socket_read($spawn, 1024);

			//TODO controllo key auth

			echo $input;
			flush();

			fwrite($flog, $input, strlen($input) );
			fflush($flog);

			$out = 'OK';
			@socket_write($spawn, $out, strlen($out));

		} catch (Exception $e) {  
        	echo $e->getMessage();  
        	#break;
   		}
	}

	socket_close($spawn);
}
fclose($flog);

socket_close($socket);

?>
