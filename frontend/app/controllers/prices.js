import Ember from 'ember';

export default Ember.Controller.extend({
	session: Ember.inject.service(),
	current:null,
	multi:[],
	expandDepth:0,
})