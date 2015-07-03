var config	= require('./config');
var db 		= require('./database');

var Promise = require('bluebird');
var plotly 	= require('plotly')(config.plotlyUserName, config.plotlyApiKey);
var _ 		= require('lodash');
var moment	= require('moment-timezone');

var graph = {};

graph.demo = function() {
	return new Promise(function(resolve, reject) {
		var dates = _getDatesFrom('2014-03-23');
		var data = [{
			x: dates,
			y: _arrayWithRandomNumbers(dates.length),
			type: 'bar'
		}];
		var layout = {
			title: "Diagram",
			xaxis: {
					title: "X-axis",
					titlefont: {
						family: "Arial, sans-serif",
						size: 18,
						color: "lightgrey"
					},
					type: "date",
					autorange: true
			},
			yaxis: {
					title: "Y-axis",
					titlefont: {
						family: "Arial, sans-serif",
						size: 18,
						color: "lightgrey"
					},
					type: "linear",
					autorange: true
			},
			fileopt: "overwrite",
			filename: "testGraph",
		};
		plotly.plot(data, layout, function (err, msg) {
			if (err) return reject(err);
			return resolve(msg);
		});
	});
};

//Work In Progress
graph.totalConsumption = function(userId) {
	return new Promise(function(resolve, reject) {
		var data = [{
			x: 2,
			y: 2,
			type: "bar"
		}];
		var graphOptions = {filename: "totalConsumption", fileopt: "overwrite"};
		plotly.plot(data, graphOptions, function(err, msg) {
			if (err) return reject(err);
			return resolve(msg);
		});
	});
};

//Helper functions
//

var _getDatesFrom = function(date) {
	var dates = [];
	if (!moment(date).isValid()) {return dates};
	var iteratorDate = moment(date);
	var stopDate = moment();
	while (iteratorDate <= stopDate) {
		dates.push(iteratorDate.format("YYYY-MM-DD"));
		iteratorDate.add(1,"days");
	}
	return dates;
};

var _arrayWithRandomNumbers = function(size) {
	var arr = [];
	for (var i=0, t=size; i<t; i++) {
		arr.push(Math.floor(Math.random() * 16));
	}
	return arr;
};

module.exports = graph;