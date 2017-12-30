import DS from "ember-data";
import Ember from "ember";

export default DS.Transform.extend({
  deserialize: function(serialized) {
    return Ember.isBlank(serialized) ? {} : serialized;
  },
  serialize: function(deserialized) {
    return Ember.isBlank(deserialized) ? {} : deserialized;
  }
});