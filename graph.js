var config	= require('./config');
var db 		= require('./database');

var Promise = require('bluebird');
var plotly 	= require('plotly')(config.plotlyUserName, config.plotlyApiKey);
var _ 		= require('lodash');
var moment	= require('moment-timezone');

var graph = {};

graph.makeHistogram = function(userName, date_arr, since) {
	return new Promise(function(resolve, reject) {
		var dates = [];
		_.each(date_arr, function(date){
			dates.push(date.format("YYYY-MM-DD HH:mm:ss"))
		});
		var data = [{
			x: dates,
			y: _.fill(Array(dates.length),1),
			type: "histogram",
			histfunc: "sum"
		}];
		var sinceDay = moment().subtract(since,'day');
		var layout = {
			title: userName + "'s histogram since " + sinceDay.format("DD.MM.YY"),
			xaxis: {
					title: 'Time',
					titlefont: {
						family: 'Arial, sans-serif',
						size: 18,
						color: 'lightgrey'
					},
					type: "date",
					range: [sinceDay.format('x'), moment().format('x')],
					autorange: false,
					tickangle: 45,
					ticks: "outside",
			},
			yaxis: {
					title: 'Number of drinks',
					titlefont: {
						family: 'Arial, sans-serif',
						size: 18,
						color: 'lightgrey'
					},
					type: 'linear',
					autorange: true,
					showline: false,
					showgrid: true,
					zeroline: true,
					gridwidth: 1.5,
					autotick: true
			},
			bargap: 0.15
		};
		var graphOptions = {
			layout: layout,
			fileopt: 'overwrite',
			filename: 'users/histograms/' + userName
		};
		plotly.plot(data, graphOptions, function (err, msg) {
			if (err) return reject(err);
			return resolve(msg);
		});
	});
};

graph.demo = function() {
	return new Promise(function(resolve, reject) {
		var dates = _getHoursFrom('2015-07-01 00');
		var drinks = _arrayWithOneAndZeroes(dates.length);
		var data = [{
			x: dates,
			y: drinks,
			type: 'histogram',
			histfunc:'sum'
		}];
		var layout = {
			title: 'Histogram',
			xaxis: {
					title: 'X-axis',
					titlefont: {
						family: 'Arial, sans-serif',
						size: 18,
						color: 'lightgrey'
					},
					type: "date",
					tickangle: 45,
					ticks: "outside",
			},
			yaxis: {
					title: 'Y-axis',
					titlefont: {
						family: 'Arial, sans-serif',
						size: 18,
						color: 'lightgrey'
					},
					type: 'linear',
			},
		};
		var graphOptions = {
			layout: layout,
			fileopt: 'new',
			filename: 'testGraphs/testGraph'
		};
		plotly.plot(data, graphOptions, function (err, msg) {
			if (err) return reject(err);
			return resolve(msg);
		});
	});
};

//Helper functions
//(used to simulate database)

var _getDatesFrom = function(date) {
	var dates = [];
	var iteratorDate = moment(date, "YYYY-MM-DD");
	if (!iteratorDate.isValid()) {return dates};	
	if (iteratorDate.isAfter(moment())) {return dates};	
	var stopDate = moment();
	while (iteratorDate <= stopDate) {
		dates.push(iteratorDate.format('YYYY-MM-DD'));
		iteratorDate.add(1,"days");
	}
	return dates;
};

var _getHoursFrom = function(date) {
	var dates = [];
	var iteratorDate = moment(date, "YYYY-MM-DD HH");
	if (!iteratorDate.isValid()) {return dates};	
	if (iteratorDate.isAfter(moment())) {return dates};	
	var stopDate = moment();
	while (iteratorDate <= stopDate) {
		dates.push(iteratorDate.format('YYYY-MM-DD HH'));
		iteratorDate.add(1,"hours");
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

var _arrayWithOneAndZeroes = function(size) {
	var arr = [];
	for (var i=0, t=size; i<t; i++) {
		arr.push(Math.floor(Math.random()*2));
	}
	return arr;
};

module.exports = graph;