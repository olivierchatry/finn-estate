import DS from 'ember-data';
import Ember from 'ember';

const GenerateMinMax = (name) => Ember.computed(`prices.@each.${name}`, function() {
	let min = Infinity, max = -Infinity;
	this.get("prices").forEach(
		price => {
			const value = +(price.get(name))
			min = Math.min(min, value)
			max = Math.max(max, value)
		}
	)
	return {min, max}
})

export default DS.Model.extend({
	finnId:DS.attr("string"),
	name:DS.attr("string"),
	parent:DS.belongsTo("area", {async:true, inverse:"children"}),
	children:DS.hasMany("area", {async:true, inverse:"parent"}),
	prices:DS.hasMany("price"),
	pricesAsArray:Ember.computed("prices.@each.{datasetIsLoaded,isLoaded,value,time}", function() {
		const array = this.get("prices").toArray().filter( a => a.get("isLoaded") && a.get("datasetIsLoaded")).map(
			(price) => price.getProperties("time", "value", "label")
		)
		return array
	}),
	title:Ember.computed.alias("name"),
	minMaxSqMeterPrice:GenerateMinMax("averageSqMeterPrice"),
	minMaxSize:GenerateMinMax("averageSize"),
	minMaxPrice:GenerateMinMax("averagePrice"),
})