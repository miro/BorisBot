// Set environment to test
process.env['NODE_ENV'] = 'test';

var db              = require('../database');
var cfg             = require('../config');
var schema          = require('../schema');
var chai            = require('chai');
var chaiAsPromised  = require('chai-as-promised');
var Promise         = require('bluebird');
var fs              = require('fs');
var _               = require('lodash');
var logger          = cfg.logger;

var userController      = require('../controllers/userController');
var drinkController     = require('../controllers/drinkController');
var ethanolController   = require('../controllers/ethanolController');
var memeController      = require('../controllers/memeController');

chai.use(chaiAsPromised);
var expect = chai.expect;

var test = {
    id: 123456,
    username: 'test',
    firstname: 'Firstname',
    lastname: 'Secondname',
    weight: '90',
    isMale: true,
    gender: 'mies',
    mainGroup: {
        id: -654321,
        name: 'testGroup'
    },
    event: {
        drinks: [{
            drinkType: 'beer',
            drinkValue: 12
        },{
            drinkType: 'wine',
            drinkValue: 12
        },{
            drinkType: 'shot',
            drinkValue: 12
        },{
            drinkType: 'long island icetea',
            drinkValue: 16
        },{
            drinkType: 'coffee',
            drinkValue: 0
        },{
            drinkType: 'tea',
            drinkValue: 0
        }],
        inHours: 2
    }
};

describe('End-to-end', function() {
    before(function(done) {
        schema.bookshelf.knex.raw('DELETE FROM users; DELETE FROM drinks;')
        .then(function() {
            logger.log('info', 'Database cleared');
            done();
        });
    });
    it('should generate a user', function(done) {
        userController.newUserProcess(test.id, test.username, test.firstname, test.lastname, test.weight + ' ' + test.gender)
        .then(function() {
            db.getUserById(test.id)
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
    it('should register ' + test.event.drinks.length + ' drinks for user', function(done) {
        var addDrinkPromises = [];
        _.times(test.event.drinks.length, function(n) {
            addDrinkPromises.push(drinkController.addDrink(0, test.id, test.username, test.event.drinks[n].drinkType, test.event.drinks[n].drinkValue, false));
        });
        Promise.all(addDrinkPromises)
        .then(function() {
            db.getCount('drinks', {creatorId: test.id}, null, true)
            .then(function(alcoholicDrinks) {
                db.getCount('drinks', {creatorId: test.id}, null, false)
                .then(function(nonAlcoholicDrinks) {
                    var totalCount = parseInt(alcoholicDrinks) + parseInt(nonAlcoholicDrinks);
                    expect(totalCount).to.equal(test.event.drinks.length);
                    done();
                });
            });
        });
    });
    it('should update user´s mainchat id', function(done) {
        userController.setGroup(test.id, test.mainGroup.id, test.mainGroup.name, true)
        .then(function() {
            db.getUsersByPrimaryGroupId(test.mainGroup.id)
            .then(function(collection) {
                var user = collection.models[0];
                expect(user).to.not.be.undefined;
                expect(user.get('telegramId')).to.equal(test.id);
                done();
            });
        });
    });
});