var config  = require('./config');
var db      = require('./database');

var Promise = require('bluebird');
var plotly  = require('plotly')(config.plotlyUserName, config.plotlyApiKey);
var _       = require('lodash');
var moment  = require('moment-timezone');

var graph = {};

graph.makeHistogram = function(momentObjects, startTimestamp) {
    return new Promise(function(resolve, reject) {
        var dates = [];
        _.each(momentObjects, function(date) {
            dates.push(date.format('YYYY-MM-DD HH:mm'));
        });

        var data = [{
            x: dates,
            y: _.fill(Array(dates.length),1),
            type: 'histogram',
            histfunc: 'sum'
        }];

        var layout = {
            title:  'Kippikset alkaen ' + startTimestamp.format('DD.MM.YY'),
            xaxis: {
                title: 'Aika',
                titlefont: {
                    family: 'Arial, sans-serif',
                    size: 18,
                    color: 'lightgrey'
                },
                type: 'date',
                range: [startTimestamp.subtract(6,'hour').format('x'), moment().add(6,'hour').format('x')],
                autorange: false,
                tickangle: 45,
                ticks: 'outside',
            },
            yaxis: {
                title: 'Kippisten lkm', // NOTE: "ä" in here breaks the plotly library
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
            bargap: 0.5
        };

        var graphOptions = {
            layout: layout,
            fileopt: 'overwrite',
            filename: 'latestBorisGraph'
        };

        plotly.plot(data, graphOptions, function (err, msg) {
            if (err) return reject(err);
            return resolve(msg);
        });
    });
};


module.exports = graph;
