// Here will be configured all the routes which the Boris will have

module.exports = function(app) {
    app.get('/', function (req, res) {
        res.render('index', { title: 'Hey', message: 'Hello there!'});
    });
}
