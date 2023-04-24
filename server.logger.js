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
			if(conf.logposts)
				logStreams.packets.write(logdate()+ text +"\n");
		},
		auth: function(text) {
			commonlog(text);
			logStreams.auth.write(logdate()+ text +"\n");
		}
	};
}();
