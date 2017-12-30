import Ember from 'ember';

export default Ember.Route.extend({
	model() {
		return this.store.findAll("area").then( (areas) => Ember.Object.create({
				parent:null,
				title:"area",
				children:areas.filter( area => Ember.isNone(area.get("parent.content")))
			})
		)
	}
})