/*

node --expose-gc --always-compact ...

*/
var spawn = require('child_process').spawn;

function rdata() {
	return "data=0*000"+parseInt(Math.random()*(9-1)+1)+"*0,1238.351718,4233.774287,183.870377,20130716231221.000,61,12,0.000000,0.127453\n"+
		")0*0001*0,1238.351718,4233.774287,183.870377,20130716231226.000,61,12,0.000000,0.127453\n"+
		")1*0001*004091,004038,004074,004070,004068,004074,000000,000255,000000\n"+
		")1*0001*004089,004039,004074,004072,004070,004070,000000,000255,000000\n"+
		")\n";
}

setInterval(function() {

	var php = spawn('/usr/bin/php', process.argv.slice(2) );
	php.stdout.resume();
	php.stderr.resume();
	//php.stdout.pipe(process.stdout);

	php.stdout.on('data', function(buf) {
		console.log( '['+ buf.toString('utf8') +']' );
	});
	php.on('error', function (err) {
		console.log('error', err);
	});
	php.on('exit', function (code) {
		console.log('ON EXIT', code);
	});
	php.on('close', function (code) {
		console.log('ON CLOSE', code);
	});
	console.log('stdin.write');	
	php.stdin.write( rdata() );
	php.stdin.end();

},100);
