'use strict';

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */
 var request = require('request-promise');
// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Hello, where would you like to go?';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Suggest me a place to visit. For example, take me to the Swiss Alps.';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'We hope you enjoyed your trip.';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createFavoriteColorAttributes(favoriteColor) {
    return {
        favoriteColor,
    };
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'TakeMeToIntent') {
        takeMeTo(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

function takeMeTo(intent, session, callback) {
  var cardTitle = intent.name;
  var locationSlot = intent.slots.Location;
  var sessionAttributes = {};
  var shouldEndSession = false;
  var speechOutput = "";
  var repromptText = "";

  if (locationSlot) {
    const location = locationSlot.value;
    sessionAttributes = createLocationAttributes(location);

    vacationRequest(location, function(response) {
      var speechOutput = getAudio(location);
      callback(sessionAttributes,
        buildSSMLSpeechletResponse(cardTitle, speechOutput, repromptText, true));
      }, function(err) {
        speechOutput = "Some error happened in request";
        callback(sessionAttributes,
          buildSpeechletResponse(cardTitle, speechOutput, "", true));
      }
    );

  } else {
    speechOutput = "Missing Location";
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
  }
}

const ocean = "https://s3.amazonaws.com/vacation-sound/ocean.mp3";
const swissAlps = "https://s3.amazonaws.com/vacation-sound/mountain.mp3";
const nightCricket = "https://s3.amazonaws.com/vacation-sound/Night-cricket-forest-sounds-90_revised_2.mp3"
function getAudio(location) {
  if (location.toLowerCase() === "swiss alps") {
    return `<speak><audio src="${swissAlps}"/></speak>`
  } else if (location.toLowerCase() === "china national park") {
    return `<speak><audio src="${nightCricket}"/></speak>`
  } else if (location.toLowerCase() === "saint martin") {
    return `<speak><audio src="${ocean}"/></speak>`
  }

  return swissAlps;

}

function getCoordinate(location) {
  if (location.toLowerCase() === "swiss alps") {
    return "47.0502,8.3093";
  } else if (location.toLowerCase() === "china national park") {
    return "30.6512,104.0759";
  } else if (location.toLowerCase() === "saint martin") {
    return "18.0708,63.0501"
  }
  return "";
}

function vacationRequest(location, successCallback, errorCallback) {
  var coordinate = getCoordinate(location);
  var weatherUri = 'https://api.darksky.net/forecast/fbc78070fd1433156bb12c5647a2ec37/'
  const weatherOptions = {
    method: 'GET',
    uri: `${weatherUri}${coordinate}`
  }
  console.log(`${weatherUri}${coordinate}`);
  request(weatherOptions)
    .then(function(response) {
      const responseObj = JSON.parse(response);
      const temp = responseObj.currently.temperature;
      const windSpeed = responseObj.currently.windSpeed;
      const duration = windSpeed >= 5 ? 15 : null;

      const vacationUri = 'http://febreze.herokuapp.com/controller/vacation';
      const vacationOptions = {
        method: 'POST',
        uri: vacationUri,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          location: location,
          temp: temp,
          duration: duration
        },
        json: true
      };

      console.log(vacationOptions);
      request(vacationOptions)
        .then(function(response) {
          console.log("successful vacation");
          successCallback(response);
        })
        .catch(function(err) {
          console.log("fail vacation");
          errorCallback(err);
        });
    })
    .catch(function(err) {
      console.log(err);
      console.log("fail weather");
      errorCallback(err);
    });
}

function createLocationAttributes(location) {
  return {
    location
  };
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};

function buildSSMLSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "SSML",
            ssml: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}
