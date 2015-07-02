var config = require('./config')
var plotly = require('plotly')("BorisBot", config.plotlyApiKey);

plotly.demo = function() {
	var data = [{x:[0,1,2], y:[3,2,1], type: 'bar'}];
	var layout = {fileopt : "extend", filename : "nodenodenode"};

	plotly.plot(data, layout, function (err, msg) {
		if (err) return console.log(err);
		console.log(msg);
	});
};