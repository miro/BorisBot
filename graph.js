var config  = require('./config');
var db      = require('./database');

var Promise = require('bluebird');
var plotly  = require('plotly')(config.plotlyUserName, config.plotlyApiKey);
var _       = require('lodash');
var moment  = require('moment-timezone');

var graph = {};

graph.makeHistogram = function(userName, date_arr, since) {
    return new Promise(function(resolve, reject) {
        var dates = [];
        _.each(date_arr, function(date){
            dates.push(date.format('YYYY-MM-DD HH:mm:ss'))
        });
        var data = [{
            x: dates,
            y: _.fill(Array(dates.length),1),
            type: 'histogram',
            histfunc: 'sum'
        }];
        var sinceDay = moment().subtract(since,'day');
        var layout = {
            title: userName + '\'s histogram since ' + sinceDay.format('DD.MM.YY'),
            xaxis: {
                title: 'Time',
                titlefont: {
                    family: 'Arial, sans-serif',
                    size: 18,
                    color: 'lightgrey'
                },
                type: 'date',
                range: [sinceDay.format('x'), moment().format('x')],
                autorange: false,
                tickangle: 45,
                ticks: 'outside',
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


module.exports = graph;
