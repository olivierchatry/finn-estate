import Ember from 'ember';

export default Ember.Controller.extend({
	session: Ember.inject.service(),
	actions:{
    signIn: function(provider) {
      this.get('session').open('firebase', { provider: provider}).then(() => {
				this.transitionToRoute('prices')
			});
    },
    signOut: function() {
			this.transitionToRoute('index').then(
				() => this.get('session').close() 
			)
    }		
	}
})