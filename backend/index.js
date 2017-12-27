const rp 			= require('request-promise-native')
const cheerio = require('cheerio')
const parsePrice = require('parse-price')
const math = require('mathjs');
const firebase = require("firebase-admin")
const serviceAccount = require("./key/finn-realestate-price")
const Stats = require('fast-stats').Stats;

const FINN_SEARCH_URL = "https://www.finn.no/realestate/homes/search.html"

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://finn-realestate-price.firebaseio.com"
});

const parseLocationTree = function($) {
	const results = []
	const inputs = $("input[type='checkbox'][name='location']")
	for (let key in inputs) {
		const input = inputs[key]
		if (input.attribs) {
			const label = $(`label[for='${input.attribs.id}'] > span`)
			if (label.length) {
				const name = label.clone().children().remove().end().text().trim();
				results.push({
					id:input.attribs.value,
					name,
				})
			}	
		}
	}
	const sorted = results.sort( 
		(a,b) => a.id.length - b.id.length
	)
	const tree = {
		children:{}
	}
	sorted.forEach( element => {
		const v = element.id.split(".")
		let 	parent = tree.children
		for (let i = 1; i < v.length; ++i) {
			parent[v[i]] = parent[v[i]] || element
			parent[v[i]].children = parent[v[i]].children || {}
			parent = parent[v[i]].children
		}
	})
	return tree
}

const fetchLocationTree = async () => {
	const html = await rp.get(FINN_SEARCH_URL)
	const $ = cheerio.load(html)		
	return parseLocationTree($) 
}

const parsePageCount = ($) => {
	const pages = $("a.phs.valign-middle")
	let   pageCount = 0
	pages.each( 
		(index, element) => pageCount = Math.max(pageCount, parseInt($(element).text()))
	)
	return pageCount
}

const prices = firebase.database().ref("prices")
const dataset = firebase.database().ref("/datasets").push({
	time:firebase.database.ServerValue.TIMESTAMP
})
const datasetPrices = {}
const queryResult = async (query, leaf, page) => {
	page = page || 1
	console.log(`finn query for *${leaf.name}* (id ${leaf.id}) page *${page}*`)
	const queryPage = `${query}&page=${page}`
	let		html
	try {
		html = await rp.get(queryPage)
	} catch(e) {
		console.warn(`error loading ${leaf.name} retrying`)
		queryResult(query, leaf, page)
	}
	const $ = cheerio.load(html)
	const pageCount = parsePageCount($) 
	if (page < pageCount) {
		await queryResult(query, leaf, page + 1)
	} 
	const finnCodesNodes = $("div.result-item > [data-finnkode]")
	leaf.finnCodes = leaf.finnCodes || []
	finnCodesNodes.each( 
		(index, element) => {
			const node 			= $(element)
			const sizePrice = $("span.prm.inlineblockify", node)
			const finnData 	= {
				finnkode:node.attr("data-finnkode"),
			}
			if (sizePrice.length === 2) {
				try {
					finnData.size = math.unit($(sizePrice[0]).text().replace("²", "^2")).toNumber("m^2")
					finnData.price = parsePrice($(sizePrice[1]).text())	
					if (finnData.size > 0 && finnData.price > 0 && !isNaN(finnData.price) && !isNaN(finnData.size)) {
						leaf.finnCodes.push(finnData) 
					}
				} catch(e) {
					console.warn(`invalid price ( probably a range ). this item will not be taken into account.`)
				}
			}
		}
	)
	if (page === 1) {
		console.log(`x found ${leaf.finnCodes.length} finn codes.`)
		if (leaf.finnCodes.length > 0) {
			const statsSqMeterPrice = new Stats()
			const statsSize = new Stats()
			const statsPrice = new Stats()
	
			leaf.finnCodes.forEach( e => {
				statsSqMeterPrice.push(e.price / e.size)
				statsPrice.push(e.price)
				statsSize.push(e.size) 
			})
			const item = prices.push({
				area:leaf.dbId,
				areaName:leaf.name,
				averageSqMeterPrice:statsSqMeterPrice.gmean(),
				averageSize:statsSize.gmean(),
				averagePrice:statsPrice.gmean(),
				dataset:dataset.key,
				finnData:leaf.finnCodes
			})
			datasetPrices[item.key] = true	
		}
	}
}

const recurseQueryTree = async (tree, query) => {
	const sep = query ? "&" : `${FINN_SEARCH_URL}?`
	query = query || ""
	if (Object.keys(tree.children).length === 0) {
		await queryResult(query, tree)
	} else {
		for (let key in tree.children) {
			const child = tree.children[key]
			await recurseQueryTree(child, `${query}${sep}location=${child.id}`)
		}
	}
}


const treeToFirebase = async (tree, parent) => {
	const areas = firebase.database().ref("areas")
	if (tree.id) {
		console.log(`updating firebase areas ${tree.name}`)
		await areas.orderByChild("finnId").equalTo(tree.id).once("value").then(
			snapshot => {
				if (!snapshot.exists()) {
					tree.dbId = areas.push({
						finnId:tree.id,
						name:tree.name,
						parent:(parent && parent.dbId) ? parent.dbId : null
					}).key
				} else {
					const obj = snapshot.val()
					tree.dbId = Object.keys(obj)[0];
				}
			}
		)	
	}
	const children = {}
	for (let key in tree.children) {
		const child = tree.children[key]
		await treeToFirebase(child, tree)
		children[child.dbId] = true
	}
	if (tree.id) {
		await firebase.database().ref(`areas/${tree.dbId}/children`).set(children)
	}
}

const main = async () => {
	const locationTree = await fetchLocationTree()
	await treeToFirebase(locationTree)
	await recurseQueryTree(locationTree)	
	await dataset.child('prices').set(datasetPrices)
}

main()
