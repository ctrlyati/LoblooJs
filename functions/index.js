const functions = require('firebase-functions');
const seedrandom = require('seedrandom');

const axios = require('axios');
const qs = require('qs')

const admin = require('firebase-admin');
admin.initializeApp()

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

exports.hello = functions.https.onRequest((request, response) => {
    const code = request.query["code"]
    functions.logger.info(`code is ${code}`, {structuredData: true})
    axios({
        method: 'post',
        url: "https://slack.com/api/oauth.v2.access",
        data: qs.stringify({
            code: code,
            client_id: functions.config().slack.client_id,
            client_secret: functions.config().slack.client_secret
        }),
        headers: {
            'Content-type': 'application/x-www-form-urlencoded'
        }
    }).then(function(res) {
        if(res.status < 400 && res.data.ok) {
            functions.logger.info(res.data, {structuredData: true})
            response.redirect(functions.config().slack.redirect)
        } else {
            functions.logger.error(res.data, {structuredData: true})
            response.send(":(")    
        }
    }).catch(function(error) {
        functions.logger.error(error, {structuredData: true})
        response.send(":(")
    })
})

function randomPick(rng, array, num) {
    var items = new Array()
    for (let i = 0; i < num; i++) {
        
        var size = array.length
        var picked = Math.round(size * rng()) % size

        functions.logger.info("pick at " + picked + "/" + size, {structuredData: true})
        items.push(array.splice(picked, 1)[0])
    }
    return items
}

function getRng(request) {
    var seed = new Date().getTime() + request.param("text", (new Date().getMilliseconds()).toString())
    functions.logger.info("seed is " + seed, {structuredData: true})
    return seedrandom(seed)
}

function getTarot(request, response, num) {
    var rng = getRng(request)

    var db = admin.firestore()
    var tarotRef = db.collection("tarots");

    tarotRef.get()
    .then(function(querySnapshot) {
        var tarots = new Array()
        querySnapshot.forEach(function(doc) {
            tarots.push(doc.data())
        });
        shuffle(tarots)

        var picked = randomPick(rng, tarots, num)

        if(picked === undefined || picked === null || picked.length == 0) {
            response.send("ลองใหม่อีกครั้งนะ")
        } else {
            functions.logger.info("picked " + picked.length + "cards", {structuredData: true})
            var cardText = ""
            picked.forEach(function(tarot){
                cardText = cardText + `{
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*${tarot.name}*\\n>${tarot.description}"
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": "${tarot.img}",
                        "alt_text": "${tarot.name}"
                    }
                },`
            })


            response.contentType("application/json")
            response.status(200)
            response.send(`
{
    "blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "โอมมมมมมม เพี้ยง!!!?!"
            }
        },
        {
            "type": "divider"
        },
        ${cardText}
        {
            "type": "divider"
        }
    ]
}
                `)
        }
    })
    .catch(function(error) {
        functions.logger.error(error)
        response.send("ฟ้าลงโทษ! ลองใหม่อีกครั้งนะ")
    });
}

exports.tarot1 = functions.https.onRequest((request, response) => {
    getTarot(request, response, 1)
})

exports.tarot3 = functions.https.onRequest((request, response) => {
    getTarot(request, response, 3)
})

exports.rottery = functions.https.onRequest((request, response) => {
    var rng = getRng(request)
    var wow = ""
    for (let index = 0; index < 6; index++) {
        wow = wow + Math.floor(rng()*10)
    }
    response.status(200).send(`งวดนี้ต้องโดนบ้างแหละ *${wow}*`)
})