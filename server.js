require('dotenv').config()
const jwt = require('jsonwebtoken');
const config = require('./config');
const rp = require('request-promise');
var email, userid, resp;

var Datastore = require('nedb'),
    // Security note: the database is saved to the file `datafile` on the local filesystem. It's deliberately placed in the `.data` directory
    // which doesn't get copied if someone remixes the project.
    db = new Datastore({filename: '.data/datafile', autoload: true});
dbHistory = new Datastore({filename: '.data/datafileHistory', autoload: true});


var fs = require('fs'),
    https = require('https'),
    express = require('express'),
    bodyParser = require('body-parser'),
    crypto = require('crypto'),
    cors = require('cors'),
    app = express();

https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(4000);
console.log("Server Started ");

app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(bodyParser.json(), cors());
app.options('*', cors());


const payload = {
    iss: config.APIKey,
    exp: ((new Date()).getTime() + 5000)
};
const token = jwt.sign(payload, config.APISecret);


app.get("/requestedMeetings", function (request, response) {
    db.find({}, function (err, meetings) { // Find all users in the collection
        // meetings.forEach(function(meeting) {
        //     console.log(meeting)
        //     // dbUsers.push([user.firstName,user.lastName]); // adds their info to the dbUsers value
        // });
        response.send(meetings); // sends dbUsers back to the page
    });
});


app.get("/requestedMeetingsHistory", function (request, response) {
    dbHistory.find({}, function (err, meetings) { // Find all users in the collection
        // meetings.forEach(function(meeting) {
        //     console.log(meeting)
        //     // dbUsers.push([user.firstName,user.lastName]); // adds their info to the dbUsers value
        // });
        response.send(meetings); // sends dbUsers back to the page
    });
});

app.post("/requestedMeetings", function (request, response) {

    // console.log(request)


    db.insert(request.body, function (err, userAdded) {
        if (err) console.log("There's a problem with the database: ", err);
        else if (userAdded) console.log("New record inserted in the database");
    });
    response.sendStatus(200);
});


app.post("/addToHistory", function (request, response) {

    dbHistory.insert(request.body, function (err, userAdded) {
        if (err) console.log("There's a problem with the database: ", err);
        else if (userAdded) console.log("New user inserted in the database");
    });
    response.sendStatus(200);
});


app.post("/requestedMeetingsRemove", function (request, response) {

    // console.log(request)
    var id = request.body.id;
    // console.log(id)


    db.remove({_id: id}, {}, function (err, numRemoved) {
        // numRemoved = 1
    });
    response.sendStatus(200);
});


app.post('/meetings', (req, res) => {
    //store the email address of the user in the email variable
    email = process.env.ZOOM_HOST_EMAIL;
    //check if the email was stored in the console
    // console.log(email);
    //Store the options for Zoom API which will be used to make an API call later.
    var options = {
        //You can use a different uri if you're making an API call to a different Zoom endpoint.
        uri: "https://api.zoom.us/v2/users/" + email + "/meetings?type=scheduled&page_size=100&page_number=1",
        qs: {
            status: 'active'
        },
        auth: {
            'bearer': token
        },
        headers: {
            'User-Agent': 'Zoom-api-Jwt-Request',
            'content-type': 'application/json'
        },
        json: true //Parse the JSON string in the response
    };

//Use request-promise module's .then() method to make request calls.
    rp(options)
        .then(function (response) {
            //printing the response on the console
            // console.log('User has', response);
            //console.log(typeof response);
            resp = response
            var i;
            var upcomingMeetingsModel = {
                upcomingMeetings: []
            };

            for (i = 0; i < resp.meetings.length; i++) {

                let date = resp.meetings[i].start_time

                if (date != null) {
                    // console.log(resp.meetings[i])
                    let timezone = resp.meetings[i].timezone
                    let duration = resp.meetings[i].duration
                    let uuid = resp.meetings[i].uuid
                    let meetingId = resp.meetings[i].id
                    let title = resp.meetings[i].topic
                    let description = resp.meetings[i].agenda
                    if (description == null) {
                        description = ""
                    }


                    upcomingMeetingsModel.upcomingMeetings.push({
                        "timezone": timezone,
                        "duration": duration,
                        "title": title,
                        "date": date,
                        "uuid": uuid,
                        "meetingId": meetingId,
                        "description": description

                    });

                }


            }

            // console.log(upcomingMeetingsModel)
            res.json({
                upcomingMeetingsModel
            })
        })
        .catch(function (err) {
            // API call failed...
            console.log('API call failed, reason ', err);
        });


});


app.post('/', (req, res) => {


    const nodemailer = require("nodemailer");


    ///POSTGRES CONNECTION///
    // const {Client} = require('pg')
    // const client = new Client({
    // user: process.env.POSTGRES_USER,
    // host: process.env.POSTGRES_HOST,
    //     database: process.env.POSTGRES_DATABASE,
    //     password: process.env.POSTGRES_PASSWORD,
    //     port: process.env.POSTGRES_PORT,
    // })
    //
    // const client2 = new Client({
    //     user: process.env.POSTGRES_USER,
    // host: process.env.POSTGRES_HOST,
    //     database: process.env.POSTGRES_DATABASE,
    //     password: process.env.POSTGRES_PASSWORD,
    //     port: process.env.POSTGRES_PORT,
    // })
    //
    //
    //
    // var countryStringForQuery = "";
    // for (let x = 0; x < req.body.countryParticipants.length; x++) {
    //     let cp = req.body.countryParticipants[x].toString()
    //
    //     if(x == req.body.countryParticipants.length-1){
    //
    //         countryStringForQuery = countryStringForQuery + "country = '" + cp + "' AND is_superuser IS NOT false"
    //     }else{
    //
    //         countryStringForQuery = countryStringForQuery + "country = '" + cp + "' OR "
    //     }
    // }
    // let countrySuperQuery = 'SELECT * FROM public.people_profile WHERE '+countryStringForQuery
    //
    //
    // var interestsStringForQuery = "";
    // for (let x = 0; x < req.body.interestAreaParticipants.length; x++) {
    //
    //     let iap = req.body.interestAreaParticipants[x]
    //     if(x == req.body.interestAreaParticipants.length-1){
    //
    //         interestsStringForQuery = interestsStringForQuery + "areaofinterest_id = '" + iap + "' AND is_superuser IS NOT false"
    //     }else{
    //
    //         interestsStringForQuery = interestsStringForQuery + "areaofinterest_id = '" + iap + "' OR "
    //     }
    //     console.log(iap)
    //
    // }
    // let interestsSuperQuery = 'SELECT * FROM public.people_profile WHERE '+interestsStringForQuery
    //
    //         client.connect()
    //         // let  customQuery = 'SELECT * FROM public.people_profile WHERE country = \'' + rfg + '\' AND is_superuser IS NOT false'
    //
    //         client.query(countrySuperQuery, (err, queryRes) => {
    //             console.log(queryRes)
    //
    //             for (let y = 0; y < queryRes.rows.length; y++) {
    //
    //                 let email = queryRes.rows[y].email
    //                 let username = queryRes.rows[y].username
    //
    //                 console.log(email)
    //                 console.log(username)
    //
    //             }
    //             client.end()
    //         })
    //
    //
    // client2.connect()
    //
    // client2.query(interestsSuperQuery, (err, queryRes) => {
    //     console.log(queryRes)
    //
    //     for (let y = 0; y < queryRes.rows.length; y++) {
    //
    //         let email = queryRes.rows[y].email
    //         let username = queryRes.rows[y].username
    //
    //         console.log(email)
    //         console.log(username)
    //
    //     }
    //     client2.end()
    // })


    const timestamp = new Date().getTime() - 30000
    const msg = Buffer.from(process.env.API_KEY + req.body.meetingNumber + timestamp + req.body.role).toString('base64')
    const hash = crypto.createHmac('sha256', process.env.API_SECRET).update(msg).digest('base64')
    const signature = Buffer.from(`${process.env.API_KEY}.${req.body.meetingNumber}.${timestamp}.${req.body.role}.${hash}`).toString('base64')


    let hostUrl = process.env.ZOOM_WEB_APP+"/meeting.html?" +
        "name=" + req.body.host.name + "" +
        "&mn=" + req.body.meetingNumber + "" +
        "&email=" + req.body.host.email + "" +
        "&pwd=" + req.body.pwd + "" +
        "&role=1" +
        "&lang=en-US" +
        "&signature=" + signature + "" +
        "&china=0" +
        "&apiKey=ERulwbo2SaS5EOH1c0GPwg"


    let dateString = req.body.time.date.split("T")

    let yearParts = dateString[0].split("-")
    let year = yearParts[0]
    let month = yearParts[1]
    let day = yearParts[2]
    let dateStringFormated=day+"-"+month+"-"+year
    let timeParts = dateString[1].split(":")
    let timeStringFormated = timeParts[0]+":"+timeParts[1]


    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_SERVER_HOST,
        port: process.env.MAIL_SERVER_PORT,
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        },
        tls: {
            // do not fail on invalid certs
            rejectUnauthorized: false
        }
    });
// send mail with defined transport object
    transporter.sendMail({
        from: process.env.MAIL_USER,
        to: req.body.host.email,
        subject: req.body.title,
        text: "Dear "+req.body.host.name+",\n\n" +
            "this is an invitation to attend the \""+req.body.title+" : "+req.body.description +"\" "+
            "zoom meeting at:" +
            "\n\n" +dateStringFormated+"" +
            "\n"+timeStringFormated+" timezone : "+req.body.time.timezone+
            "\n\nTo join the meeting , you can use the following links: \n\n" +
            "Zoom Web App link : \n"+hostUrl + "" +
            "\n\nZoom Desktop App link : \n"+req.body.start_url +
            "\n\nBest regards,\nCACIP admin"
    });

    for (x = 0; x < req.body.participants.length; x++) {

        let participantUrl =process.env.ZOOM_WEB_APP+"/meeting.html?" +
            "name="+req.body.participants[x].name+"" +
            "&mn="+req.body.meetingNumber+"" +
            "&email="+req.body.participants[x].email+"" +
            "&pwd="+req.body.pwd+"" +
            "&role=0" +
            "&lang=en-US" +
            "&signature="+signature+"" +
            "&china=0" +
            "&apiKey=ERulwbo2SaS5EOH1c0GPwg"



        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_SERVER_HOST,
            port: process.env.MAIL_SERVER_PORT,
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            },
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false
            }
        });
// send mail with defined transport object
        transporter.sendMail({
            from: process.env.MAIL_USER,
            to: req.body.participants[x].email,
            subject: req.body.title,
            text: "Dear "+req.body.participants[x].name+",\n\n" +
                "this is an invitation to attend the \""+req.body.title+" : "+req.body.description +"\" "+
                "zoom meeting at:" +
                "\n\n" +dateStringFormated+"" +
                "\n"+timeStringFormated+" timezone : "+req.body.time.timezone+
                "\n\nTo join the meeting , you can use the following links: \n\n" +
                "Zoom Web App link : \n"+participantUrl + "" +
                "\n\nZoom Desktop App link : \n"+req.body.join_url +
                "\n\nBest regards,\nCACIP admin"
        });

    }



    res.json({
        success: "ok"
    })
})


app.post('/add_participant', (req, res) => {


    var request = require('request');
    var options = {
        'method': 'GET',
        'url': 'https://api.zoom.us/v2/meetings/' + req.body.requestedMeetingId,
        'headers': {
            'authorization': 'Bearer ' + token
        }
    };
    request(options, function (error, response) {
        if (error) throw new Error(error);

        let jsonRes = JSON.parse(response.body);

        let meetingPassword = jsonRes.password
        let desktopLink = jsonRes.join_url


        const timestamp = new Date().getTime() - 30000
        const msg = Buffer.from(process.env.API_KEY + req.body.requestedMeetingId + timestamp + req.body.role).toString('base64')
        const hash = crypto.createHmac('sha256', process.env.API_SECRET).update(msg).digest('base64')
        const signature = Buffer.from(`${process.env.API_KEY}.${req.body.requestedMeetingId}.${timestamp}.${req.body.role}.${hash}`).toString('base64')


        let participantUrl = process.env.ZOOM_WEB_APP+"/meeting.html?" +
            "name=" + req.body.requestedContactUsername + "" +
            "&mn=" + req.body.requestedMeetingId + "" +
            "&email=" + req.body.requestedContactEmail + "" +
            "&pwd=" + meetingPassword + "" +
            "&role=0" +
            "&lang=en-US" +
            "&signature=" + signature + "" +
            "&china=0" +
            "&apiKey=ERulwbo2SaS5EOH1c0GPwg"


        res.json({
            participantUrl: participantUrl,
            desktopLink: desktopLink
        })


    });


})

//
// app.post("/postgres_country", function (request, response) {
//
//
//     const {Client} = require('pg')
//
//
//     const client = new Client({
//         user: process.env.POSTGRES_USER,
//         host: process.env.POSTGRES_HOST,
//         database: process.env.POSTGRES_DATABASE,
//         password: process.env.POSTGRES_PASSWORD,
//         port: process.env.POSTGRES_PORT,
//     })
//
//     let rfg = "eng"
//
//     client.connect()
//     client.query('SELECT * FROM public.people_profile WHERE country = \'' + rfg + '\' AND is_superuser IS NOT false', (err, res) => {
//         // console.log(err, res)
//
//         // console.log(res)
//
//         for (let y = 0; y < res.rows.length; y++) {
//
//             let email = res.rows[y].email
//             let username = res.rows[y].username
//
//             console.log(email)
//             console.log(username)
//
//
//         }
//
//         client.end()
//     })
//
//
//     response.json({
//         test: "hi"
//     })
//
// });
//
//
// app.post("/postgres_areas_of_interest", function (request, response) {
//
//
//     const {Client} = require('pg')
//
//
//     const client = new Client({
//         user: process.env.POSTGRES_USER,
//         host: process.env.POSTGRES_HOST,
//         database: process.env.POSTGRES_DATABASE,
//         password: process.env.POSTGRES_PASSWORD,
//         port: process.env.POSTGRES_PORT,
//     })
//     client.connect()
//     client.query('SELECT * FROM public.people_profile WHERE areaofinterest_id = \'eng\' AND is_superuser IS NOT true', (err, res) => {
//         // console.log(err, res)
//
//         console.log(res)
//
//         client.end()
//     })
//
//
//     response.json({
//         test: "hi"
//     })
//
// });
//

app.post('/create_meeting', (req, res) => {
    //store the email address of the user in the email variable
    //check if the email was stored in the console
    let createMeetinghostEmail = process.env.ZOOM_HOST_EMAIL;
    let createMeetingTitle = req.body.createMeetingTitle;
    let createMeetingDate = req.body.createMeetingDate;
    let createMeetingDuration = req.body.createMeetingDuration;
    let createMeetingTimezone = req.body.createMeetingTimezone;
    let createMeetingDescription = req.body.createMeetingDescription;
    var password = Math.random().toString(36).slice(-8);


    var request = require('request');
    var options = {
        'method': 'POST',
        'url': 'https://api.zoom.us/v2/users/' + createMeetinghostEmail + '/meetings',
        'headers': {
            'Content-Type': 'application/json'
        },
        auth: {
            'bearer': token
        },
        body: JSON.stringify({
            "topic": createMeetingTitle,
            "start_time": createMeetingDate,
            "duration": createMeetingDuration,
            "timezone": createMeetingTimezone,
            "password": password,
            "agenda": createMeetingDescription
        })

    };
    request(options, function (error, response) {
        if (error) throw new Error(error);
        // console.log(response.body);

        res.json(
            response.body
        )

    });


});



