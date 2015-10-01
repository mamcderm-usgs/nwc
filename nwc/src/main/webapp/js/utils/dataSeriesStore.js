var NWC = NWC || {};

NWC.util = NWC.util || {};

NWC.util.DataSeries = function () {
	return {
		newSeries : function() {
			var createSeriesLabel = function (metadata) {
				var label = metadata.seriesName;
				if (metadata.seriesUnits.length !== 0) {
					label += ' (' + metadata.seriesUnits + ')';
				}
				return label;
			};
			return {
				metadata: {
					seriesLabels: [{
						seriesName: 'Date',
						seriesUnits: ''
					}],
					downloadHeader: ""
				},
				data: [],
				toCSV: function() {
					var csvHeader = "";
					if (this.metadata.downloadHeader && this.metadata.downloadHeader.length !== 0) {
						this.metadata.downloadHeader.lines(function(line) {
							csvHeader += "\"# " + line + "\"\r\n";
						});
					}
					csvHeader += this.metadata.seriesLabels.map(function(label) {
						return createSeriesLabel(label);
					}).join(",") + "\r\n";
					var csvValues = "";
					this.data.each(function(row) {
						csvValues += row.join(",") + "\r\n";
					});
					return csvHeader + csvValues;
				},
				getDataAs: function(measurementSystem, measure, normalizationFn) {
					var convert = NWC.util.Units[measurementSystem][measure].conversionFromBase;
					var normalize = normalizationFn || NWC.util.Convert.noop;
					return this.data.map(function(arr) {
						// Assume All series have untouchable date
						var date = arr[0];
						return [date].concat(arr.from(1).map(normalize).map(convert));
					});
				},
				getSeriesLabelsAs: function(measurementSystem, measure, timeGranularity) {
					return this.metadata.seriesLabels.map(function(label) {
						var seriesMetadata = Object.clone(label);
						seriesMetadata.seriesUnits = ''; //NWC.util.Units[measurementSystem][measure][timeGranularity];
						return createSeriesLabel(seriesMetadata);
					});
				}
			}
		}
	};
}();

/**
* Given mixed frequency data series metadata and data, converts it to
* monthly and daily series for Graph to consume.
* @returns {undefined}
*/
NWC.util.DataSeriesStore = function () {

	var self = this;

	//indices of fields in store presented after update method
	var columnIndices = {
			date: 0,
			dayMet: 1,
			eta: 2,
			nwisStreamFlowData: 3
	};

	var addSeriesLabel = function (seriesClass, metadata) {
		/* we are doing union to only get Date once,
		 * basically we union the series so we need to union the labels
		 */
		var labels = self[seriesClass].metadata.seriesLabels;
		self[seriesClass].metadata.seriesLabels = labels.union(metadata.seriesLabels);
	};

	//these string helpers that are called 100's of times per time series
	//are faster than constructing a new date from the string and
	//using the resultant date object's instance methods
	var getDayIndexInString = function (stringDate) {
		return stringDate.lastIndexOf('/') + 1;
	};
	var getDayNumberFromDateString = function (stringDate) {
		var dayIndexInString = getDayIndexInString(stringDate);
		var dayString = stringDate.substr(dayIndexInString, 2);
		return Number(dayString);
	};

	//these string helpers that are called 100's of times per time series
	//are faster than constructing a new date from the string and
	//using the resultant date object's instance methods
	var getMonthIndexInString = function (stringDate) {
		return stringDate.indexOf('/') + 1;
	};
	var getMonthNumberFromDateString = function (stringDate) {
		var monthIndexInString = getMonthIndexInString(stringDate);
		var monthString = stringDate.substr(monthIndexInString, 2);
		return Number(monthString);
	};

	//minimize floating point error in accumulation
	var roundConstant = 9;
	var saferAdd = function (value1, value2) {
		return (value1 + value2).round(roundConstant);
	};

	self.getIndexOfColumnNamed = function(columnName) {
			return columnIndices[columnName];
	};

	self.daily = NWC.util.DataSeries.newSeries();
	self.monthly = NWC.util.DataSeries.newSeries();
	self.yearly = NWC.util.DataSeries.newSeries();

	/*
	daymet comes in daily
	eta comes in monthly
	(optional) nwisStreamFlowData comes in daily
	Presume both series' data arrays are sorted in order of ascending date.

	Every day-row of every month must have a daymet value as-is
	If a given month has a monthly eta value, you must divide the value
	by the number of days in the month and insert the result in
	every day-row for that month. If a given month has no eta value,
	insert NaN in every day-row for that month.

	@param {Object} nameToSeriesMap - properties for dayMet and eta which should both be dataSeries objects.
	*/
	self.updateDailyHucSeries = function (nameToSeriesMap) {
		var dailyTable = [],
		etaIndex = 0,
		nwisStreamFlowDataIndex = 0,
		//set eta for daily
		etaForCurrentMonth = NaN,
		dayMetSeries = nameToSeriesMap.dayMet,
		dayMetSeriesStartDate = dayMetSeries.data[0][0],
		etaSeries = nameToSeriesMap.eta,
		nwisStreamFlowDataSeries = nameToSeriesMap.nwisStreamFlowData,
		nwisStreamFlowDataSeriesMatch = false;

		//if we have a streamflow series, get the first entry that matches
		//up with the earliest dayMet series entry.  may want to change this
		//in the future to plot any streamflow values that occur before
		//the dayMet entries.
		if (nwisStreamFlowDataSeries) {
			nwisStreamFlowDataSeries.data.each(function (nwisStreamFlowData) {
				if (nwisStreamFlowData[0] < dayMetSeriesStartDate) {
					nwisStreamFlowDataIndex++;
				}
				else if (nwisStreamFlowData[0] > dayMetSeriesStartDate){
					dayMetSeries.data.each(function (dayMetRow) {
						if (nwisStreamFlowData[0] === dayMetRow[0]) {
							nwisStreamFlowDataSeriesMatch = true;
							return false;
						}
						else {
							nwisStreamFlowDataIndex++;	
						}
					});
				}
				else {
					nwisStreamFlowDataSeriesMatch = true;
					return false;					
				}
			});
		}

		dayMetSeries.data.each(function (dayMetRow) {
			var dayMetDateStr = dayMetRow[0],
			dayMetValue = dayMetRow[1],
			dayMetDay = getDayNumberFromDateString(dayMetDateStr);
			//currently, we are using the dayMet range to govern this method
			//and therefore we need to sync the streamflow data with the first 
			//daymet date or earliest daymet date, if streamflow data comes
			//after the first daymet values. this whole thing probably needs
			//to change though.
			if (nwisStreamFlowDataSeriesMatch) {
				if (nwisStreamFlowDataSeries.data[nwisStreamFlowDataIndex][0] > dayMetRow[0]) {
					nwisStreamFlowDataValue = NaN;
					nwisStreamFlowDataIndex--; //decrement because of the increment at the end of loop
				}
				else {
					nwisStreamFlowDataValue = nwisStreamFlowDataSeries.data[nwisStreamFlowDataIndex][1];
				}
			}
			else {
				nwisStreamFlowDataValue = NaN
			}
			//if looking at the first day of a month
			if (1 === dayMetDay) {
				var etaRow = etaSeries.data[etaIndex];
				//check to see if you've fallen off the end of the eta data
				if (etaRow) {
					var etaDateStr = etaRow[0];
					var etaValue = etaRow[1];
					//ensure that there is eta data for this month.
					if (etaDateStr === dayMetDateStr) {
						etaForCurrentMonth = etaValue;
						etaIndex++;
					}
				}//else we have fallen off the end of the eta array
				else {
					etaForCurrentMonth = NaN;
				}
			}
			var date = Date.create(dayMetDateStr).utc();
			var averageDailyEta = etaForCurrentMonth / date.daysInMonth();
			var rowToAdd = [];
			rowToAdd[columnIndices.date] = date;
			rowToAdd[columnIndices.dayMet] = dayMetValue;
			rowToAdd[columnIndices.eta] = averageDailyEta;
			if (nwisStreamFlowDataSeries) {
				rowToAdd[columnIndices.nwisStreamFlowData] = nwisStreamFlowDataValue;
			}
			dailyTable.push(rowToAdd);
			nwisStreamFlowDataIndex++;
		});
		self.daily.data = dailyTable;

		addSeriesLabel('daily', dayMetSeries.metadata);
		addSeriesLabel('daily', etaSeries.metadata);
		if (nwisStreamFlowDataSeries) {
			addSeriesLabel('daily', nwisStreamFlowDataSeries.metadata);
		}
	},

	/*
	daymet comes in daily
	eta comes in monthly
	Presume both series' data arrays are sorted in order of ascending date.

	Every month-row must have an eta value as-is

	If there are daily daymet records for that month, we must accumulate all of them
	and put them in the daymet value for that month-row. If there are no daily daymet records for that month,
	let the daymet value for that month-row be NaN

	If the first day of a month has daymet values, daymet values will be present for every day of a month,
	except if the month in question is the last month in the period of record, in which case it might not have daymet values
	for every day of the month. If there is not a complete set of daily values for the last month, omit the month.
	
	One exception to the previous rule is to ignore the case where only the last value of a month is not present.
	*/
	self.updateMonthlyHucSeries = function (nameToSeriesMap) {
		var monthlyTable = [],
		etaIndex = 0,
		etaForCurrentMonth = NaN,
		dayMetSeries = nameToSeriesMap.dayMet,
		monthlyAccumulation = 0,
		monthDateStr = '', //stored at the beginning of every month, used later once the totals have been accumulated for the month
		endOfMonth, //stores the end of the current month of iteration
		etaSeries = nameToSeriesMap.eta;
		nwisStreamFlowDataSeries = nameToSeriesMap.nwisStreamFlowData;

		dayMetSeries.data.each(function (dayMetRow) {
			var dayMetDateStr = dayMetRow[0],
			dayMetValue = dayMetRow[1],
			dayMetDay = getDayNumberFromDateString(dayMetDateStr);
			if (undefined === endOfMonth) {
				endOfMonth = Date.create(dayMetDateStr).utc().daysInMonth();
				monthDateStr = dayMetDateStr;
			}
			//this will have the effect of ignoring a missing value at the end of the month
			//because Dec 31 for leap years is "padded" with a NaN value
			if (dayMetValue) {
				monthlyAccumulation = saferAdd(monthlyAccumulation, dayMetValue);				
			}
			if (dayMetDay === endOfMonth) {
				//join the date, accumulation and the eta for last month
				var etaRow = etaSeries.data[etaIndex];
				if (etaRow) {
					var etaDateStr = etaRow[0];
					var etaValue = etaRow[1];
					if (etaDateStr === monthDateStr) {
						etaForCurrentMonth = etaValue;
						etaIndex++;
					}
				}
				//else we have fallen off the end of the eta array
				else {
					etaForCurrentMonth = NaN;
				}
				var date = Date.create(monthDateStr).utc();
				var rowToAdd = [];
				rowToAdd[columnIndices.date] = date;
				rowToAdd[columnIndices.dayMet] = monthlyAccumulation;
				rowToAdd[columnIndices.eta] = etaForCurrentMonth;
				monthlyTable.push(rowToAdd);

				//reset for the next months
				monthlyAccumulation = 0;
				endOfMonth = undefined;
			}
		});
		self.monthly.data = monthlyTable;

		addSeriesLabel('monthly', dayMetSeries.metadata);
		addSeriesLabel('monthly', etaSeries.metadata);
	},

	/*
	daymet comes in daily
	eta comes in monthly
	Presume both series' data arrays are sorted in order of ascending date.

	Start accumulating dayMet records at the first full year (i.e. 01-01-yyyy)
	On the last day of the month, see if there is a corresponding eta record.
	If there is an eta record, accumulate the value.
	If there are 12 months of dayMet values, put the accumulated value in the
	dayMet value for that year-row and put the accumulated eta value in the eta value for that year-row.  

	If the first day of a month has daymet values, daymet values will be present for every day of a month,
	except if the month in question is the last month in the period of record, in which case it might not have daymet values
	for every day of the month. If there is not a complete set of daily values for the last month, omit the month.
	
	One exception to the previous rule is to ignore the case where only the last value of a month is not present.
	*/
	self.updateYearlyHucSeries = function (nameToSeriesMap) {
		var yearlyTable = [],
		etaIndex = 0,
		etaMonths = 0,
		etaForCurrentMonth = NaN,
		dayMetSeries = nameToSeriesMap.dayMet,
		dayMetYearlyAccumulation = 0,
		etaYearlyAccumulation = 0,
		monthDateStr = '', //stored at the beginning of every month, used to join monthly values
		yearDateStr = '', //stored at the beginning of every year, used later once the totals have been accumulated for the year
		endOfMonth, //stores the end of the current month of iteration
		etaSeries = nameToSeriesMap.eta;

		dayMetSeries.data.each(function (dayMetRow) {
			var dayMetDateStr = dayMetRow[0],
			dayMetValue = dayMetRow[1],
			dayMetDay = getDayNumberFromDateString(dayMetDateStr);
			dayMetMonth = getMonthNumberFromDateString(dayMetDateStr);
			//if first time through or new month is true 
			if (undefined === endOfMonth) {
				endOfMonth = Date.create(dayMetDateStr).utc().daysInMonth();
				monthDateStr = dayMetDateStr;
				//start on a complete year
				if (1 === dayMetDay && 1 === dayMetMonth) {
					//use the first day of the year as the date for the year-row
					yearDateStr = dayMetDateStr;
				}
				//if first time through but not beginning of year is true
				else if (0 == etaMonths) {
					endOfMonth = undefined;
				}
			}
			//if first time through but not beginning of year is true skip until beginning of year			
			if (undefined != endOfMonth) {
				//this will have effect of ignoring a missing value at the end of the month
				if (dayMetValue) {
					//accumulate each daymet value for the entire year
					dayMetYearlyAccumulation = saferAdd(dayMetYearlyAccumulation, dayMetValue);
				}
				//if you hit the end of the month of dayMet values is true
				if (dayMetDay === endOfMonth) {
					//add to counter to indicate when you have processed 12 months
					etaMonths++;
					//grab the eta row
					var etaRow = etaSeries.data[etaIndex];
					if (etaRow) {
						var etaDateStr = etaRow[0];
						var etaValue = etaRow[1];
						//if the eta row date is the same as the dayMet row date is true
						//otherwise skip until these dates are in sync
						if (etaDateStr === monthDateStr) {
							//put the monthly eta value in a variable
							etaForCurrentMonth = etaValue;
							etaIndex++;
						}
					}
					//else we have fallen off the end of the eta array
					else {
						etaForCurrentMonth = NaN;
					}
					//accumulate the monthly eta value
					etaYearlyAccumulation = saferAdd(etaYearlyAccumulation, etaForCurrentMonth);
					//reset the days in month indicator to start new month
					endOfMonth = undefined;						

					//if 12 months of daymet values have been accumulated
					if (etaMonths == 12) {
						var date = Date.create(yearDateStr).utc();
						var rowToAdd = [];
						rowToAdd[columnIndices.date] = date;
						rowToAdd[columnIndices.dayMet] = dayMetYearlyAccumulation;
						rowToAdd[columnIndices.eta] = etaYearlyAccumulation;
						yearlyTable.push(rowToAdd);
		
						//reset for the next years
						etaMonths = 0;
						dayMetYearlyAccumulation = 0;
						etaYearlyAccumulation = 0;
						endOfYear = undefined;						
					}
				}
			}
		});
		self.yearly.data = yearlyTable;

		addSeriesLabel('yearly', dayMetSeries.metadata);
		addSeriesLabel('yearly', etaSeries.metadata);
	},

	/*
	* @param {Map<String, DataSeries>} nameToSeriesMap A map of series id to
	* DataSeries objects
	*/
	self.updateHucSeries = function (nameToSeriesMap) {
//it doesn't look like we need these...remove?
//		this.eta = nameToSeriesMap.eta;
//		this.dayMet = nameToSeriesMap.dayMet;
//		this.nwisStreamFlowData = nameToSeriesMap.nwisStreamFlowData;

		this.updateDailyHucSeries(nameToSeriesMap);
		this.updateMonthlyHucSeries(nameToSeriesMap);
		this.updateYearlyHucSeries(nameToSeriesMap);
	};

};