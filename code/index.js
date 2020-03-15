var request = require('request');
var restify = require('restify');
var builder = require('botbuilder');


// Connector
var connectorAppId = process.env.MicrosoftAppId;
var connectorAppPassword = process.env.MicrosoftAppPassword;

var inMemoryStorage = new builder.MemoryBotStorage();

var openWeatherMapKey = YOUR_OPENWETHERMAP_KEY;

// LUIS model
var luisModelUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/YOUR_APPLICATION_ID?subscription-key=YOUR_APPLICATION_KEY';


// Create Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create connector and bot
var connector = new builder.ChatConnector({
    appId: connectorAppId,
    appPassword: connectorAppPassword
});

var bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage);;
server.post('/api/messages', connector.listen());

// Create LUIS recognizer 
var recognizer = new builder.LuisRecognizer(luisModelUrl);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);


// Adding dialog
dialog.matches('GetWeather', [
    function (session, args, next) {
        var city = builder.EntityRecognizer.findEntity(args.entities, 'city');
        session.send("looks like you want to know the weather")
        
        if (!city) {
            builder.Prompts.text(session, 'Which city ?');  
        } else {
            next({ response: city.entity });
        }
    },
    
    function (session, results) {
        if (results.response){
            openweathermap(results.response, function(success, previsions) {
                if (!success) return session.send('An error has occurred');
                                    
                session.send('It is ' + previsions.temperature + '°C in '
                             + previsions.city + ' with ' + previsions.description;);
            });
        }
       
    }
]);

dialog.onDefault(function (session) {
    session.send('I do not understand what you mean');
});


var openweathermap = function(city, callback){
	var url = 'http://api.openweathermap.org/data/2.5/weather?q=' + city + '&lang=en&units=metric&appid=' + openWeatherMapKey;
	
	request(url, function(err, response, body){
		try{		
			var result = JSON.parse(body);
			
			if (result.cod != 200) {
				callback(false);
			} else {
				var previsions = {
					temperature : Math.round(result.main.temp),
					city : result.name,
                    description: result.weather[0].description
				};
						
				callback(true, previsions);
			}
		} catch(e) {
			callback(false); 
		}
	});
}