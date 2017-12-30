import Ember from 'ember';

export default Ember.Route.extend({
  session: Ember.inject.service(),
  beforeModel: function() {
    return this.get('session').fetch().then( () => {
			if (this.get("session.currentUser")) {
				this.transitionTo('prices')				
			}
		}).catch(function() {});
	},
});