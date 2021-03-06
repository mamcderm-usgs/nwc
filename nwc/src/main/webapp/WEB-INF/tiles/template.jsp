<!DOCTYPE HTML>
<%@include file="/WEB-INF/base.jsp"%>
<%@ taglib prefix="tiles" uri="http://tiles.apache.org/tags-tiles"%>

<html>
	<head>
		<tiles:insertAttribute name="meta" />
		<script type="text/javascript">
			(function(){
				window.CONFIG = {};
				CONFIG.endpoint = {};
				CONFIG.endpoint.direct = {};

				//point to local proxies
				CONFIG.endpoint.geoserver = '${context}/proxy/geoserver/';
				CONFIG.endpoint.thredds = '${context}/proxy/thredds/';
				CONFIG.endpoint.wps = '${context}/proxy/wps/WebProcessingService'; //TODO inconsistant use of of URL resources
				CONFIG.endpoint.nwis = '${context}/proxy/nwis/';
				
				CONFIG.endpoint.direct.geoserver = '${directGeoserverEndpoint}';
				CONFIG.endpoint.direct.thredds = '${directThreddsEndpoint}';
				CONFIG.endpoint.direct.wps = '${directWpsEndpoint}';
				CONFIG.endpoint.direct.nwis = '${directNwisEndpoint}';
			}());
		</script>

	</head>
	<body>
		<div class="container site_body_content">
			<div class="row">
				<div id="site_header" class="col-xs-12">
					<tiles:insertAttribute name="header" />
				</div>
			</div>
			<div class="row">
				<div id="site_nav" class="col-xs-12">
					<tiles:insertAttribute name="nav" />
				</div>
			</div>
			<div class="row site_body_content">
				<div id="site_content" class="col-xs-12">
					<tiles:insertAttribute name="body" />
				</div>
			</div>
		</div>
		
		<!--	<div id="site_footer" class="navbar-fixed-bottom"> -->
		<div id="site_footer" class="">
			<tiles:insertAttribute name="footer" />
 		</div>
	</body>
</html>
