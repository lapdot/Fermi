function staticRender(req, res, path) {
	res.render(path, {account: req.user} );
};

module.exports = function(app) {


	/*app.get('/overview',function (req, res) {
		staticRender(req, res, 'overview');
	});

	app.get('/overview/chem',function (req, res) {
		staticRender(req, res, 'overview-chem');
	});

	app.get('/overview/phy',function (req, res) {
		staticRender(req, res, 'overview-phy');
	});*/

	/*app.get('/courses',function (req, res) {
		staticRender(req, res, 'courses');
	});*/

	/*app.get('/courses/chem',function (req, res) {
		staticRender(req, res, 'courses-chem');
	});*/

	/*app.get('/courses/phy',function (req, res) {
		staticRender(req, res, 'courses-phy');
	});*/

	/*app.get('/courses/math',function (req, res) {
		staticRender(req, res, 'courses-math');
	});*/

	/*app.get('/faculty',function (req, res) {
		staticRender(req, res, 'faculty');
	});*/

	/*app.get('/faculty/xiao',function (req, res) {
		staticRender(req, res, 'faculty-xiao');
	});

	app.get('/faculty/cai',function (req, res) {
		staticRender(req, res, 'faculty-cai');
	});

	app.get('/faculty/liu',function (req, res) {
		staticRender(req, res, 'faculty-liu');
	});

	app.get('/faculty/wang',function (req, res) {
		staticRender(req, res, 'faculty-wang');
	});

	app.get('/faculty/li',function (req, res) {
		staticRender(req, res, 'faculty-li');
	});

	app.get('/faculty/qin',function (req, res) {
		staticRender(req, res, 'faculty-qin');
	});

	app.get('/faculty/tianyi',function (req, res) {
		staticRender(req, res, 'faculty-tianyi');
	});

	app.get('/diy/bing', function (req, res) {
		staticRender(req, res, 'diy-bing');
	});

	app.get('/diy/ce', function (req, res) {
		staticRender(req, res, 'diy-ce');
	});

	app.get('/diy/shui', function (req, res) {
		staticRender(req, res, 'diy-shui');
	});

	app.get('/diy/first', function (req, res) {
		staticRender(req, res, 'diy-first');
	});

	app.get('/diy/second', function (req, res) {
		staticRender(req, res, 'diy-second');
	});

	app.get('/diy/third', function (req, res) {
		staticRender(req, res, 'diy-third');
	});

	app.get('/diy/fourth', function (req, res) {
		staticRender(req, res, 'diy-fourth');
	});

	app.get('/news/first', function (req, res) {
		staticRender(req, res, 'news-first');
	});

	app.get('/news/second', function (req, res) {
		staticRender(req, res, 'news-second');
	});

	app.get('/news/third', function (req, res) {
		staticRender(req, res, 'news-third');
	});

	app.get('/news/fourth', function (req, res) {
		staticRender(req, res, 'news/4/index');
	});

	app.get('/news/fifth', function (req, res) {
		staticRender(req, res, 'news/5/index');
	});

	app.get('/news/test', function (req, res) {
		staticRender(req, res, 'news/0/index');
	});*/

	app.get('/about', function (req, res) {
		res.redirect('/news/first');
	});
}