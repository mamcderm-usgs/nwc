/*jslint browser: true*/
/*global OpenLayers*/

var NWC = NWC || {};

NWC.view = NWC.view || {};

/*
 * View for the water budget huc data page
 * @constructor extends NWC.BaseView
 */

NWC.view.WaterBudgetHucDataView = NWC.view.BaseView.extend({

	templateName : 'waterbudgetHucData',

	events: {
		'click #counties-button' : 'displayCountyMap',
		'click #compare-hucs-button' : 'goToAddHucMapPage',
		'click #units-btn-group button' : 'changeUnits',
		'click #time-scale-btn-group button' : 'changeTimeScale',
	},

	context : {
	},

	initialize : function(options) {

		this.context.hucId = options.hucId;
		this.hucId = options.hucId;
		this.insetHucMapDiv = options.insetHucMapDiv;

		// call superclass initialize to do default initialize
		// (includes render)
		NWC.view.BaseView.prototype.initialize.apply(this, arguments);

		this.setUpHucPlotModel();

		this.plotView = new NWC.view.WaterbudgetPlotView({
			hucId : options.hucId,
			el : this.$el.find('#huc1-plot-container'),
			model : this.hucPlotModel
		});

		this.buildHucMap(this.hucId);
		this.hucMap.render(this.insetHucMapDiv);
	},

	setUpHucPlotModel : function() {
		// Add listeners to model
		this.hucPlotModel = new NWC.model.WaterBudgetHucPlotModel();
		this.listenTo(this.hucPlotModel, 'change:units', this.updateUnits);
		this.listenTo(this.hucPlotModel, 'change:timeScale', this.updateTimeScale);

		var newTimeScale = this.hucPlotModel.get('timeScale');
		this.setButtonActive($('#daily-button'), newTimeScale === 'daily');
		this.setButtonActive($('#monthly-button'), newTimeScale === 'monthly');

		var newUnits = this.hucPlotModel.get('units');
		this.setButtonActive($('#customary-button'), newUnits === 'usCustomary');
		this.setButtonActive($('#metric-button'), newUnits === 'metric');
	},

	buildHucMap : function(huc) {

		var d = $.Deferred();

		var baseLayer = NWC.util.mapUtils.createWorldStreetMapLayer();

		this.hucMap = NWC.util.mapUtils.createMap([baseLayer], [new OpenLayers.Control.Zoom(), new OpenLayers.Control.Navigation()]);

		this.hucLayer = NWC.util.mapUtils.createHucFeatureLayer(huc);

		this.hucLayer.events.on({
			featureadded: function(event){
				this.hucName = event.feature.attributes.hu_12_name;
				this.hucMap.zoomToExtent(this.hucLayer.getDataExtent());

				$('#huc-name').html(event.feature.attributes.hu_12_name);
				d.resolve();
			},
			loadend: function(event) {
				$('#huc-loading-indicator').hide();
				$('#counties-button').prop('disabled', false);
				$('#compare-hucs-button').prop('disabled', false);
			},
			scope : this
		});

		this.hucMap.addLayer(this.hucLayer);
		this.hucMap.zoomToExtent(this.hucMap.getMaxExtent());

		return d.promise();
	},

	displayCountyMap : function() {
		this.hucCountMapView = new NWC.view.HucCountyMapView({
			mapDiv : 'county-selection-map',
			hucFeature : new OpenLayers.Feature.Vector(
					this.hucLayer.features[0].geometry.clone(),
					this.hucLayer.features[0].attributes),
			router : this.router,
			el : $('#county-selection-div')
		});
	},

	goToAddHucMapPage : function() {
		this.router.navigate('waterbudget/map/huc/' + this.hucId, {trigger: true});
	},

	changeUnits : function(ev) {
		ev.preventDefault();
		var newUnits = ev.target.value;
		this.hucPlotModel.set('units', newUnits);
	},

	updateUnits : function(ev) {
		var newUnits = this.hucPlotModel.get('units');
		this.setButtonActive($('#customary-button'), newUnits === 'usCustomary');
		this.setButtonActive($('#metric-button'), newUnits === 'metric');
	},

	changeTimeScale : function(ev) {
		ev.preventDefault();
		var newTimeScale = ev.target.value;
		this.hucPlotModel.set('timeScale', newTimeScale);
	},

	updateTimeScale : function(ev) {
		var newTimeScale = this.hucPlotModel.get('timeScale');
		this.setButtonActive($('#daily-button'), newTimeScale === 'daily');
		this.setButtonActive($('#monthly-button'), newTimeScale === 'monthly');
	},

	remove : function() {
		if (Object.has(this, 'hucCountyMapView')) {
			this.hucCountyMapView.remove();
		}
		this.plotView.remove();
		NWC.view.BaseView.prototype.remove.apply(this, arguments);
	}
});