import DS from 'ember-data';
import Ember from 'ember';

export default DS.Model.extend({
	area:DS.belongsTo("area"),
	dataset:DS.belongsTo("dataset"),
	averagePrice:DS.attr("number"),
	averageSize:DS.attr("number"),
	averageSqMeterPrice:DS.attr("number"),
	finnData:DS.attr("object"),
	time:Ember.computed.alias("dataset.time"),
	datasetIsLoaded:Ember.computed.alias("dataset.isLoaded"),
	label:Ember.computed("area.selectedAverageName", function() {
		return this.get("area.selectedAverageName") || "averageSqMeterPrice"
	}),
	value:Ember.computed("label", function() {
		return this.get(this.get("label"))
	})
})