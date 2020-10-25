# SER421 Lab3 pkedilay

## To run:
I have bundled this as a `npm` package. So you just need to run the following commands:

`npm install`

`npm start`

`node` and `npm` are expected to be installed on the grading computer.

## Other instructions
1. Both extra credits are done.
2. For switching rendering engines, open `config.json` and change the value of `template` to either `pug` or `ejs` and then restart server.
3. Questions are stored in `./database/survey.json`. You may alter or add or delete the questions. Restart of server not necessary, but need to start new login/re-login to access the new set of queestions.
4. I have used json files as database for storing user choices. It is in `./database/users.json`.
5. All json files can be modified but should not alter the JSON structure since we are mimicing a database here.