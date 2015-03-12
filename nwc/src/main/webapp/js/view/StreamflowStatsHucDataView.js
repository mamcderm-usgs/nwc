var NWC = NWC || {};

NWC.view = NWC.view || {};

/*
 * View for the streamflow stats huc data page
 * @constructor extends NWC.BaseView
 */

NWC.view.StreamflowStatsHucDataView = NWC.view.BaseView.extend({

	templateName : 'streamflowHucStats',

	MIN_DATE : Date.create('1980/10/01').utc(),
	MAX_DATE : Date.create('2010/09/30').utc(),

	context : {
	},

	render : function() {
		NWC.view.BaseView.prototype.render.apply(this, arguments);
		this.map.render(this.insetMapDiv);
	},

	initialize : function(options) {
		this.context.hucId = options.hucId;
		this.context.years = NWC.util.WaterYearUtil.yearsAsArray(NWC.util.WaterYearUtil.waterYearRange(Date.range(this.MIN_DATE, this.MAX_DATE)));
		this.insetMapDiv = options.insetMapDiv;

		var baseLayer = NWC.util.mapUtils.createWorldStreetMapLayer();

		this.map = NWC.util.mapUtils.createMap([baseLayer], [new OpenLayers.Control.Zoom(), new OpenLayers.Control.Navigation()]);

		var hucLayer = NWC.util.mapUtils.createHucSEBasinFeatureLayer(options.hucId);

		//TODO: take out console.log statements. Leaving in console.log statements for now until HUC feature layer works.
		hucLayer.events.on({
			featureadded: function(event){
				console.log('Feature added');
				this.map.zoomToExtent(this.getDataExtent());

				$('#huc-name').html(event.feature.attributes.HU_12_NAME);
				$('#huc-drainage-area').html(event.feature.attributes.DRAIN_SQKM);
			},
			loadend: function(event) {
				$('#loading-indicator').hide();
				console.log('Layer loaded');
			}
		});
		this.map.addLayer(hucLayer);

		NWC.view.BaseView.prototype.initialize.apply(this, arguments);
		this.map.zoomToExtent(this.map.getMaxExtent());
		var $start = $('#start-year option[value="' + this.context.years.first() + '"]');
		var $end = $('#end-year option[value="' + this.context.years.last() + '"]');
		$start.prop('selected', true);
		$end.prop('selected', true);
	}

});
