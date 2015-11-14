var request = require('request');
var jsdom = require("jsdom");
var fs = require("fs");
var fse = require("fs-extra");
var jquery = fs.readFileSync("./public/vendor/js/jquery-1.11.3.min.js", "utf-8");
var im = require('imagemagick');
var path = require('path');

//var wxUrl = "http://mp.weixin.qq.com/s?__biz=MzA3MjIxMDQ4MA==&mid=234300542&idx=1&sn=0b453c0127e44d8db983782c7fa58449#rd";
//var destName = "4";
var getPhotoOnline = true;

function run(wxUrl, destName, callback) {
	var viewDirPrefix = "./views";
	var imgDirPrefix = "./public";

	var viewDestDir = "/news/" + destName;
	var imgDestDir = "/images/news/" + destName;

	jsdom.env({
		url: wxUrl,
		src: [jquery],
		done: function (errors, window) {
			var $ = window.$;

			mkDir(viewDirPrefix + viewDestDir);
			mkDir(imgDirPrefix + imgDestDir);
			imgDestDir = imgDestDir + "/images";
			mkDir(imgDirPrefix + imgDestDir);
			console.log("Parser begins.");
			$("#img-content h2")
				.after('<p><br></br></p>')
				.replaceWith('<h3>' + $('#img-content h2').html() + '</h3>');
			$("#img-content .rich_media_meta_list").remove();
			$("#img-content span:contains('点击文章上方')").each(
				function () {
					var parent = $(this).parent();
					if (parent.text() === parent.children().text()) {
						parent.nextAll().remove();
						parent.remove();
					}
				}
			);
			
			var imgTotal = 0;
			var imgArray = [];
			$("#img-content #js_content p").each(
				function () {
					var img = $(this).find("img");
					var imgUrl;
					if (img && img.length > 0) {
						img.attr("width","100%");
						imgUrl = img.attr("data-src");
						imgTotal++;
						imgArray.push(imgUrl);
						imgDest = imgDestDir + "/image" + imgTotal + "_sm.jpeg";
						img.attr("src",imgDest);
						img.wrap("<div class='row'></div>").wrap("<div class='col-md-offset-2 col-md-8'></div>");
					}
				}
			);
			console.log("Parser ends.");

			var content = $("#img-content").html();
			var prefix = "<div class='row'><div class='col-md-12'><div class='context-content'><div class='inner-content'><div>"
			var suffix = "</div></div></div></div></div>";
			content = prefix + content + suffix;
		
			var prefix_actual = "{{> subnav_news}}";
			var actual = prefix_actual + content;
		
			fs.writeFileSync(viewDirPrefix + viewDestDir + "/index.handlebars", actual);

			console.log("Picture downloader begins.");

			var imgUrl;
			var downloadStream;
			var outStream;
			if (getPhotoOnline) {
				for (i = 0; i < imgArray.length; i++){
					imgUrl = imgArray[i];
					downloadStream = request.get(imgUrl);
					outStream = fs.createWriteStream(imgDirPrefix + imgDestDir + "/image" + (i+1) + ".jpeg")
					downloadStream.pipe(outStream);
					outStream.on('finish',
						function() {
							imgTotal--;
							if (imgTotal === 0) {
								console.log("Picture downloader ends.");
								resizePictures(imgArray, destName, callback);
							}
						}
					);
				}
			}
		}
	});	
}

function resizePictures(imgArray, destName, callback) {
	var viewDirPrefix = "./views";
	var imgDirPrefix = "./public";

	var viewDestDir = "/news/" + destName;
	var imgDestDir = "/images/news/" + destName + "/images";

	var i;
	var imgTotal = imgArray.length;
	var str;
	console.log("Picture zipper begins.");
	for (i = 0; i < imgArray.length; i++) {
		str = imgDirPrefix + imgDestDir+ "/image" + (i+1);
		im.convert([str + ".jpeg", 
			"-resize","600x","-quality","75",
			str + "_sm.jpeg"],
			function (err) {
				if (err) throw err;
				imgTotal--;
				if (imgTotal === 0) {
					console.log("Picture zipper ends.")
					callback();
				}
				//fs.writeFileSync(imgDirPrefix + imgDestDir + "/image" + i + "_sm.jpeg", stdout, 'binary');
			}
		);
	}
}

function mkDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}

function copy(src, dest) {
	fse.copySync(src, dest);
}

module.exports = {
	run: run,
	mkDir: mkDir,
	copy: copy
};