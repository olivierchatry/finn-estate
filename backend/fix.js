const firebase = require("firebase-admin")
const serviceAccount = require("./key/finn-realestate-price")

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://finn-realestate-price.firebaseio.com"
});

const db = firebase.database()
const multipath = {}
db.ref("prices").once("value").then(
	snapShot => {
		snapShot.forEach(
			priceSnapShot => {
				const price = priceSnapShot.val()
				const key   = priceSnapShot.key
				multipath[`areas/${price.area}/prices/${key}`] = true
			}
		)
	}
).then(
	() => db.ref().update(multipath)
).then(
	() => firebase.app().delete()
).then(
	() => process.exit(0)
)
