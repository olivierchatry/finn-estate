import Ember from 'ember';
import { storageFor } from 'ember-local-storage';

export default Ember.Controller.extend({
	session: Ember.inject.service(),
	multi: storageFor('multi-selections'),
	expandDepth:1,
	actions:{
		removeFromSelection(item) {
			this.get("multi").removeObject(item)
		}
	}
})