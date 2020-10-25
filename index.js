const express = require('express'),
    ejs = require('ejs'),
    pug = require('pug'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    { readFileWrapper, writeFileWrapper } = require('./fileOperations');

const filename = './database/users.json';

// Create server and listen at port 3000
const app = express();

setViews();

// Sets either ejs(default) or pug based on entries in config.json
async function setViews() {
    var dataString = await readFileWrapper("./config.json");
    var data = JSON.parse(dataString);
    app.set('views', './views');
    if (data.template === 'pug') {
        // Set view engine as pug
        app.set('view engine', 'pug');
        app.engine('pug', pug.__express);
    } else {
        // Set view engine as ejs
        app.set('view engine', 'ejs');
        app.engine('html', ejs.renderFile);
    }
}

// Initialize session management middleware
app.use(session({
    secret: 'MAGICALEXPRESSKEY',
    resave: true,
    saveUninitialized: true
}));

// Inititaize body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Initialize cookie parser middleware
app.use(cookieParser());

// Set cache control in response headers
app.use((request, response, next) => {
    response.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

app.get('/', (_request, response) => {
    response.redirect('/landing');
})

app.get('/landing', (request, response) => {
    var username = getUsername(request);
    username = username === undefined ? request.cookies.mvcname : username;
    renderPage('landing', {
        username: username
    }, response);
});

app.get('/preferences', (request, response) => {
    renderPage('preferences', {
        preference: request.cookies.mvcrendering
    }, response);
});

app.post('/setPreference', (request, response) => {
    response.cookie('mvcrendering', request.body.preference);
    response.redirect(307, '/survey');
});

app.post('/survey', async (request, response) => {
    try {
        let navigation = request.body.submit;
        if (navigation !== undefined) {
            if (navigation === 'next') {
                nextQuestion(request);
            } else if (navigation === 'previous') {
                prevQuestion(request);
            }
        } else {
            await initializeSurvey(request, response);
        }
        renderSurveyPageWrapper(request, response);
    } catch (err) {
        console.error(err);
        response.redirect('/');
    }
});

app.post('/match', async (request, response) => {
    setUsername(request, response);
    var userData = await getUserDetails();
    renderPage('matchlist', {
        username: getUsername(request),
        users: getUsersForMatch(getUsername(request), userData.usersList)
    }, response);
});

// Initialize survey only for the first time in the session
async function initializeSurvey(request, response) {
    setUsername(request, response);
    await readSurveyQuestionsWrapper(request);
}

// Save the current selection to session
function saveOption(option, session) {
    var questionId = session.questions[session.currentQuestion].id;
    session.userChoices[questionId] = option;
}

// Render Page
function renderPage(filename, options, response) {
    app.render(filename, options, (err, renderedData) => {
        if (err) {
            console.error(err)
            response.send('500: Internal Server Error');
        } else {
            response.send(renderedData);
        }
    });
}

// Asynchronous wrapper to read survey questions
async function readSurveyQuestionsWrapper(request) {
    var dataString = await readFileWrapper("./database/survey.json");
    if (dataString === '') {
        request.session.questions = [];
    } else {
        var data = JSON.parse(dataString);
        request.session.questions = data['questions'];
        request.session.currentQuestion = 0;
        request.session.userChoices = await getStoredUserChoices(request);
    }
}

// Wrapper to render survey page or thankyou page on click of next
function renderSurveyPageWrapper(request, response) {
    var session = request.session;
    if (session.questions.length === 0) {
        response.send('No questions at this time!');
        return;
    }
    if (session.currentQuestion === session.questions.length) {
        renderThankYouPage(request, response);
    } else {
        renderSurveyQuestion(request, response)
    }
}

// Renders survey question to the user
function renderSurveyQuestion(request, response) {
    var index = request.session.currentQuestion;
    var session = request.session;
    renderPage('survey', {
        page: index + 1,
        username: getUsername(request),
        question: session.questions[index].question,
        choices: session.questions[index].choices,
        selected: getSelectedOption(session, index),
        isVertical: (request.cookies.mvcrendering === 'vertical')
    }, response);
}

// Renders Thank You Page
function renderThankYouPage(request, response) {
    saveAndDestroySession(request);
    renderPage('thankyou', {}, response);
}

// Saves userChoices to database and destroys current session
async function saveAndDestroySession(request) {
    var username = request.session.username;
    var users = await getUserDetails();
    users.usersList[username] = request.session.userChoices;
    writeFileWrapper(filename, users);
    request.session.destroy();
}

// Get user choices from database
async function getStoredUserChoices(request) {
    var username = request.session.username;
    var users = await getUserDetails();
    var userChoices = users.usersList[username];
    return userChoices !== undefined ? userChoices : {}
}

// Get all users from database
async function getUserDetails() {
    var userString = await readFileWrapper(filename);
    return JSON.parse(userString);
}

// Sets username in session as well as browser cookie
function setUsername(request, response) {
    let username = request.body.username;
    request.session.username = username;
    response.cookie('mvcname', username, new Date());
}

function getUsername(request) {
    return request.session.username;
}

function nextQuestion(request) {
    saveOption(request.body.answer, request.session);
    request.session.currentQuestion++;
}

function prevQuestion(request) {
    saveOption(request.body.answer, request.session);
    request.session.currentQuestion--;
}

function getSelectedOption(session, index) {
    var questionId = session.questions[index].id;
    return session.userChoices[questionId] === undefined ? '' : parseInt(session.userChoices[questionId]);
}

// Helper function which generates a object of objects with key username and value matches
function getUsersForMatch(username, userData) {
    var users = {};
    var hashMap = new Map();
    if (userData[username] !== undefined) {
        for (let question in userData[username]) {
            hashMap.set(question, userData[username][question]);
        }
    }
    for (let user in userData) {
        var match = 0;
        for (let question in userData[user]) {
            if (user !== username && hashMap.has(question) &&
                hashMap.get(question) === userData[user][question]) {
                match++;
            }
        }
        if (user !== username) users[user] = match;
    }
    return Object.entries(users)
        .sort(([, a], [, b]) => b - a)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
}

// Set Error Page
app.all('*', (request, response, next) => {
    response.status(404);
    response.send('404: Page Not Found');
});

// Handle intenal server errors
app.use((err, request, response, next) => {
    console.error(err);
    response.status(500);
    response.send('500: Internal Server Error');
});

// Intentionally at the last
app.listen(3000);