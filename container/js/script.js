$(document).ready(function() {

	// Credentials
	var baseUrl = "https://api.dialogflow.com/v1/";
	var accessToken = "af6d22ca459f4437a268d04d5fc774b6";

	//---------------------------------- Add dynamic html bot content-------------------------------------
	var mybot = '<div class="chatCont" id="chatCont">'+
								'<div class="bot_profile">'+
									'<img src="container/img/bb8.gif" class="bot_p_img">'+
									'<div class="close">'+
										'<i class="fa fa-times" aria-hidden="true"></i>'+
									'</div>'+
								'</div><!--bot_profile end-->'+
								'<div id="result_div" class="resultDiv"></div>'+
								'<div class="chatForm" id="chat-div">'+
									'<div class="spinner">'+
										'<div class="bounce1"></div>'+
										'<div class="bounce2"></div>'+
										'<div class="bounce3"></div>'+
									'</div>'+
									'<input type="text" id="chat-input" autocomplete="off" placeholder="Escriba aqui"'+ 'class="form-control bot-txt"/>'+
								'</div>'+
							'</div><!--chatCont end-->'+

							'<div class="profile_div">'+
								'<div class="row">'+
									'<div class="col-hgt">'+
										'<img src="container/img/bb8.gif" class="img-circle img-profile">'+
									'</div><!--col-hgt end-->'+
									'<div class="col-hgt">'+
										'<div class="chat-txt">'+
											'Chatea ahora!'+
										'</div>'+
									'</div><!--col-hgt end-->'+
								'</div><!--row end-->'+
							'</div><!--profile_div end-->';

	$("mybot").html(mybot);

	// ------------------------------------------ Toggle chatbot -----------------------------------------------
	$('.profile_div').click(function() {
		$('.profile_div').toggle();
		$('.chatCont').toggle();
		$('.bot_profile').toggle();
		$('.chatForm').toggle();
		document.getElementById('chat-input').focus();
	});

	$('.close').click(function() {
		$('.profile_div').toggle();
		$('.chatCont').toggle();
		$('.bot_profile').toggle();
		$('.chatForm').toggle();
	});
	
	

	// Session (genera el id de la session a enviar --------------------------------------
	var session = function() {
		
		if(sessionStorage.getItem('session')) {
			var retrievedSession = sessionStorage.getItem('session');
		} else {
			// generador de número random
			var randomNo = Math.floor((Math.random() * 1000) + 1);
			// get Timestamp
			var timestamp = Date.now();
			// get Day
			var date = new Date();
			var weekday = new Array(7);
			weekday[0] = "Sunday";
			weekday[1] = "Monday";
			weekday[2] = "Tuesday";
			weekday[3] = "Wednesday";
			weekday[4] = "Thursday";
			weekday[5] = "Friday";
			weekday[6] = "Saturday";
			var day = weekday[date.getDay()];
			var session_id = randomNo+day+timestamp;
			sessionStorage.setItem('session', session_id);
			var retrievedSession = sessionStorage.getItem('session');
		}
		return retrievedSession;
	}

	var mysession = session();


	// para recuperar el texto ingresado en chat-input --------------------------------------------------------------------------------------
	$('#chat-input').on('keyup keypress', function(e) {
		var keyCode = e.keyCode || e.which;
		var text = $("#chat-input").val();
		if (keyCode === 13) { //si es un enter
			if(text == "" ||  $.trim(text) == '') {
				e.preventDefault();
				return false;
			} else {
				setUserResponse(text);
				send(text);
				e.preventDefault();
				return false;
			}
		}
	});


	//------------------------------------------- Envía request a dialogFlow ---------------------------------------
	
	function send(text) {
      //var text = $("#chat-input").val();
      $.ajax({
		type: "POST",
		url: baseUrl + "query?v=20150910",
		contentType: "application/json; charset=utf-8",
		dataType: "json",
		headers: {
			"Authorization": "Bearer " + accessToken
      },
      data: JSON.stringify({ query: text, lang: "es", sessionId: mysession }),
      success: function(data) {
		main(data)
      },
      error: function() {
      setResponse("Internal Server Error");
      }
      });
	}
	

	//------------------------------------------- Main --------------------------------------------------------
	function main(data) {
		//var action = data.result.action.weather; //recupera la acción creada en el agente
		//var speech = data.result.fulfillment.speech; //recupera la respuesta
		const http = require('http');
		const functions = require('firebase-functions');

		const host = 'api.worldweatheronline.com';
		const wwoApiKey = 'e4ea497c70d747a6b12191708191406';

		exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {
		  // Get the city and date from the request
		  let city = req.body.queryResult.parameters['geo-city']; // city is a required param

		  // Get the date for the weather forecast (if present)
		  let date = '';
		  if (req.body.queryResult.parameters['date']) {
			date = req.body.queryResult.parameters['date'];
			console.log('Date: ' + date);
		  }

		  // Call the weather API
		  callWeatherApi(city, date).then((output) => {
			res.json({ 'fulfillmentText': output }); // Return the results of the weather API to Dialogflow
		  }).catch(() => {
			res.json({ 'fulfillmentText': `I don't know the weather but I hope it's good!` });
		  });
		});

		function callWeatherApi (city, date) {
		  return new Promise((resolve, reject) => {
			// Create the path for the HTTP request to get the weather
			let path = '/premium/v1/weather.ashx?format=json&num_of_days=1' +
			  '&q=' + encodeURIComponent(city) + '&key=' + wwoApiKey + '&date=' + date;
			console.log('API Request: ' + host + path);

			// Make the HTTP request to get the weather
			http.get({host: host, path: path}, (res) => {
			  let body = ''; // var to store the response chunks
			  res.on('data', (d) => { body += d; }); // store each response chunk
			  res.on('end', () => {
				// After all the data has been received parse the JSON for desired data
				let response = JSON.parse(body);
				let forecast = response['data']['weather'][0];
				let location = response['data']['request'][0];
				let conditions = response['data']['current_condition'][0];
				let currentConditions = conditions['weatherDesc'][0]['value'];

				// Create response
				let output = `La condición actual en ${location['type']} 
				${location['query']} son ${currentConditions} with a projected high of
				${forecast['maxtempC']}°C or ${forecast['maxtempF']}°F and a low of 
				${forecast['mintempC']}°C or ${forecast['mintempF']}°F on 
				${forecast['date']}.`;

				// Resolve the promise with the output text
				console.log(output);
				resolve(output);
			  });
			  res.on('error', (error) => {
				console.log(`Error calling the weather API: ${error}`)
				reject();
			  });
			});
		  });
		}
		
		setBotResponse(output);
	}

	//------------------------------------ Muestra la respuesta del Bot en result_div -------------------------------------
	function setBotResponse(val) {
		setTimeout(function(){
			if($.trim(val) == '') {
				val = 'No puedo\'t recuperar. Intente\' de nuevo!'
				var BotResponse = '<p class="botResult">'+val+'</p><div class="clearfix"></div>';
				$(BotResponse).appendTo('#result_div');
			} else {
				val = val.replace(new RegExp('\r?\n','g'), '<br />');
				var BotResponse = '<p class="botResult">'+val+'</p><div class="clearfix"></div>';
				$(BotResponse).appendTo('#result_div');
			}
			scrollToBottomOfResults();
			hideSpinner();
		}, 500);
	}

	//------------------------------------- Muestra la respuesta del usuario en result_div ------------------------------------
		function setUserResponse(val) {
			var UserResponse = '<p class="userEnteredText">'+val+'</p><div class="clearfix"></div>';
			$(UserResponse).appendTo('#result_div');
			$("#chat-input").val('');
			scrollToBottomOfResults();
			showSpinner();
		}

	//---------------------------------------- scrollBottom---------------------------------------------------------------------
	function scrollToBottomOfResults() {
		var terminalResultsDiv = document.getElementById('result_div');
		terminalResultsDiv.scrollTop = terminalResultsDiv.scrollHeight;
	}


	//---------------------------------------------- ícono de carga ------------------------------------------------------------
	function showSpinner() {
		$('.spinner').show();
	}
	function hideSpinner() {
		$('.spinner').hide();//escribiendo
	}
});