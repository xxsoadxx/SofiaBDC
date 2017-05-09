// RiveScript-JS
//
// Node.JS Web Server for RiveScript
//
// Run this and then communicate with the bot using `curl` or your favorite
// REST client. Example:
//
// curl -i \
//    -H "Content-Type: application/json" \
//    -X POST -d '{"username":"soandso","message":"hello bot"}' \
//    http://localhost:2001/reply

var express = require("express"),
	bodyParser = require("body-parser"),
	RiveScript = require("./lib/rivescript.js");
var db = require('diskdb');
db = db.connect('./db', ['data','log']);

// Create the bot.
var bot = new RiveScript({debug: false});

var botBackground = new RiveScript({debug: false});



bot.loadDirectory("./Sofia_Brain", success_handler_back, error_handler);

botBackground.loadDirectory("./Background_Brain", success_handler, error_handler);

function success_handler_back (loadcount) {
	console.log("Load #" + loadcount + " completed!");

	botBackground.sortReplies();
}


function success_handler (loadcount) {
	console.log("Load #" + loadcount + " completed!");

	bot.sortReplies();

	// Set up the Express app.
	var app = express();

	// Parse application/json inputs.
	app.use(bodyParser.json());
	app.set("json spaces", 4);
	app.use('/', express.static('public'));
	// Set up routes.
	app.post("/reply", getReply);
	app.get("/", showUsage);
	app.get("*", showUsage);

	// Start listening.
	app.listen(2002, function() {
		console.log("Listening on http://localhost:2002");
	});
}

function error_handler (loadcount, err) {
	console.log("Error loading batch #" + loadcount + ": " + err + "\n");
}

// POST to /reply to get a RiveScript reply.
function getReply(req, res) {
	// Get data from the JSON post.
	var username = req.body.username;
	var message  = req.body.message;
	var vars     = req.body.vars;

	// Make sure username and message are included.
	if (typeof(username) === "undefined" || typeof(message) === "undefined") {
		return error(res, "username and message are required keys");
	}

	// Copy any user vars from the post into RiveScript.
	if (typeof(vars) !== "undefined") {
		for (var key in vars) {
			if (vars.hasOwnProperty(key)) {
				bot.setUservar(username, key, vars[key]);
			}
		}
	}

	// Get a reply from the bot.
	var aux = accents(message)
	var reply = bot.reply(username, aux, this);
	if(reply === 'Unknown'){
		var reply = botBackground.reply(username, aux, this);
	}
	var log = {
		person:username,
		msgin:message,
		msgout:reply,
		date: new Date()
	};
	db.log.save(log);
	if(reply === 'Unknown'){
		db.data.save(log);
		reply = 'Disculpa, no te he entendido.';
	}
	// Get all the user's vars back out of the bot to include in the response.
	vars = bot.getUservars(username);

	// Send the JSON response.
	res.json({
		"status": "ok",
		"reply": reply,
		"vars": vars
	});
}

// All other routes shows the usage to test the /reply route.
function showUsage(req, res) {
	var egPayload = {
		"username": "soandso",
		"message": "Hello bot",
		"vars": {
			"name": "Soandso"
		}
	};
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.write("Usage: curl -i \\\n");
	res.write("   -H \"Content-Type: application/json\" \\\n");
	res.write("   -X POST -d '" + JSON.stringify(egPayload) + "' \\\n");
	res.write("   http://localhost:2001/reply");
	res.end();
}

// Send a JSON error to the browser.
function error(res, message) {
	res.json({
		"status": "error",
		"message": message
	});
}


function accents(text) {
    var dict = {"á":"a", "é":"e", "í":"i", "ó":"o", "ú":"u","Á":"a","É":"e","Í":"i","Ó":"o","Ú":"u", "?":" ", "¿":" ", ".":" ", ",":" ", ";":" " , ":":" "  , "\\":" ", "\"":" "  ,"$":" monto ",  }

    text = text.replace(/[^\w ]/g, function(char) {
        var val = dict[char] || char;
        return val;
    });
    return text;
}
