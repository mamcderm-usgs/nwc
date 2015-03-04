var NWC = NWC || {};

NWC.controller = NWC.controller || {};



NWC.controller.NWCRouter = Backbone.Router.extend({

	applicationContextDiv : '#site_content',

	aquaticBiologyFeaturesModel : new NWC.model.AquaticBiologyFeaturesModel(),

	routes: {
		'' : 'home',
		'waterbudget/huc/:huc' : 'waterbudgetHucData',
		'waterbudget' : 'waterbudget',
		'streamflow-stats' : 'streamflowStats',
		'streamflow-stats/gage/:gageid' : 'streamflowStatsGageData',
		'streamflow-stats/huc/:huc' : 'streamflowStatsHucData',
		'aquatic-biology' : 'aquaticBiology',
		'aquatic-biology/select-features' : 'aquaticBiologySelectFeatures',
		'data-discovery' : 'dataDiscovery'
	},

	home : function() {
		this.showView(NWC.view.HomeView);
	},

	waterbudget : function() {
		this.showView(NWC.view.WaterBudgetMapView, {mapDiv : 'hucSelectMap'});
	},

	waterbudgetHucData : function(huc) {
		$(this.applicationContextDiv).html('Water Budget Huc Data for Huc 12 ' + huc);
	},

	streamflowStats : function() {
		this.showView(NWC.view.StreamflowStatsMapView, {mapDiv : 'streamflow-select-map'});
	},

	streamflowStatsGageData : function(gageid) {
		$(this.applicationContextDiv).html('Streamflow Stats for gage ' + gageid);
	},

	streamflowStatsHucData : function(huc) {
		$(this.applicationContextDiv).html('Streamflow Stats  for HUC 12 ' + huc);
	},

	aquaticBiology : function() {
		this.showView(NWC.view.AquaticBiologyMapView, {
			mapDiv : 'aquatic-biology-map',
			aquaticBiologyFeaturesModel : this.aquaticBiologyFeaturesModel
		});
	},

	aquaticBiologySelectFeatures : function() {
		$(this.applicationContextDiv).html('Select features: site count: ' +
			this.aquaticBiologyFeaturesModel.get('sites').length + ', Gage count: ' +
			this.aquaticBiologyFeaturesModel.get('gages').length + ', Huc count: ' +
			this.aquaticBiologyFeaturesModel.get('hucs').length);
	},

	dataDiscovery : function() {
		this.showView(NWC.view.DataDiscoveryView);
	},

	showView : function(view, opts) {
		var newEl = $('<div>');

		this.removeCurrentView();
		$(this.applicationContextDiv).append(newEl);
		this.currentView = new view($.extend({
			el: newEl,
			router: this
		}, opts));
	},
	removeCurrentView : function() {
		if (this.currentView) {
			this.currentView.remove();
		}
	}
});
