process.env['NODE_ENV'] = 'test';

var db                  = require('../database');
var cfg                 = require('../config');
var schema          = require('../schema');
var userController = require('../controllers/userController');
var drinkController = require('../controllers/drinkController');
var ethanolController = require('../controllers/ethanolController');

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var Promise = require('bluebird');
var fs          = require('fs');
var _           = require('lodash');

chai.use(chaiAsPromised);
var expect = chai.expect;

var test = {
    id: 123456,
    username: 'KaKu',
    firstname: 'Kalervo',
    lastname: 'Kummola',
    weight: '90',
    isMale: true,
    gender: 'mies',
    group: {
        isTrue: false
    },
    event: {
        drinks: [{
            drinkType: 'kalja',
            drinkValue: 12
        },{
            drinkType: 'kalja',
            drinkValue: 12
        },{
            drinkType: 'kalja',
            drinkValue: 12
        },{
            drinkType: 'kalja',
            drinkValue: 12
        }],
        inHours: 2
    }
};

describe('End-to-end', function() {
    before(function(done) {
        schema.bookshelf.knex.raw('DELETE FROM users; DELETE FROM drinks;')
        .then(function() {done();});
    });
    it('should generate a user', function(done) {
        userController.newUserProcess(test.id, test.username, test.firstname, test.lastname, test.weight + ' ' + test.gender)
        .then(function() {
            db.getUserById(123456)
            .then(function(model) {
                expect(model).to.not.be.null;
                expect(model.get('telegramId')).to.equal(test.id);
                expect(model.get('userName')).to.equal(test.username);
                expect(model.get('firstName')).to.equal(test.firstname);
                expect(model.get('lastName')).to.equal(test.lastname);
                expect(model.get('weight')).to.equal(parseInt(test.weight));
                expect(model.get('isMale')).to.equal(test.isMale);
                done();
            });
        });
    });
    it('should register ' + test.event.drinks.length + ' drinks', function(done) {
        var addDrinkPromises = [];
        _.times(test.event.drinks.length, function(n) {
            addDrinkPromises.push(drinkController.addDrink(0, test.id, test.username, test.event.drinks[n].drinkType, test.event.drinks[n].drinkValue, test.group.isTrue));
        });
        Promise.all(addDrinkPromises)
        .then(function() {
            done()
        });
    });
});