var onHeatmapClick;
var onPolygonClick;
var onDockpntClick;
var onlineTaxiMes;

window.onload = function() {

	var bmap = new BMap.Map("mapview"); // 创建地图实例  
	var point = new BMap.Point(120.871592, 32.022942); // 创建点坐标  
	bmap.centerAndZoom(point, 14); // 初始化地图，设置中心点坐标和地图级别  
	bmap.enableScrollWheelZoom(); // 允许滚轮缩放

	// 地图控件设定
	bmap.addControl(new BMap.MapTypeControl({ anchor: BMAP_ANCHOR_BOTTOM_RIGHT }));
	bmap.addControl(new BMap.GeolocationControl({ anchor: BMAP_ANCHOR_BOTTOM_RIGHT, offset: new BMap.Size(11, 50) }));

	heatmapOverlay = new BMapLib.HeatmapOverlay({
		radius: 8.5,
		maxOpacity: 0.8,
		minOpacity: 0.5,
		blur: 0.9,
		gradient: {
			.2: '#66CCFF',
			.5: '#FFCC66',
			.8: '#FF0000'
		}
	});
	bmap.addOverlay(heatmapOverlay);
	heatmapOverlay.hide();

	var cityAreaArr = [];
	var cityAreaPolygon = [];
	var taxiArr = new Array();

	// 城市区域Json数据读取
	$.ajax({
		type: 'get',
		url: 'http://localhost:8086/cityArea',
		dataType: 'json',
		success: function(cityAreaJson) {
			console.log("Start to init cityArea...");

			cityAreaJson.features.forEach(function(feature) {

				var pointArr = [];

				feature.geometry.coordinates.forEach(function(coords) {

					coords.forEach(function(coord) {

						var pntCoord = wgs2bd(coord[0], coord[1]);
						var point = new BMap.Point(pntCoord[0], pntCoord[1]);

						pointArr.push(point);
					});

				});

				cityAreaArr.push({ "areaName": feature.properties.name, "areaCoord": pointArr });
			});
			console.log("Init City Area => SUCCESS " + (new Date()).toLocaleString());

			setInterval(cityAreaOverlays(), 3600000);
			console.log("Set Area Calc Interval => SUCCESS " + (new Date()).toLocaleString());
			setInterval(onlineTaxiHeat(), 300000);
			console.log("Set Online Taxi Heatmap Interval => SUCCESS " + (new Date()).toLocaleString());
		},
		error: function(request, message, object) {
			console.log("Init City Area => ERROR : " + object + message + " " + (new Date()).toLocaleString());
		}
	});

	var taxiDockArr = [];
	var taxiDockCircle = [];
	var taxiDockMaker = [];
	// 城市出租车停靠点数据读取
	$.ajax({
		type: 'get',
		url: 'http://localhost:8086/taxiDock',
		dataType: 'json',
		success: function(cityDockJson) {
			console.log("Start to init taxiDock...");

			var dockIcon = new BMap.Icon("./img/dockPnt.png", new BMap.Size(10, 12)); 

			cityDockJson.features.forEach(function(feature, i) {
				var dockPnt = feature.geometry;
				var pntCoord = wgs2bd(dockPnt.coordinates[0], dockPnt.coordinates[1]);
				var point = new BMap.Point(pntCoord[0], pntCoord[1]);

				taxiDockArr.push({ "dockID": feature.properties.OBJECTID, "dockPnt": point });

				// 创建标注对象并添加到地图
				var marker = new BMap.Marker(point, { icon: dockIcon });
				taxiDockMaker.push(marker);
				bmap.addOverlay(marker);
			});
			console.log("Init City Taxi Dock => SUCCESS " + (new Date()).toLocaleString());

			setInterval(cityDockOverlays(), 3600000);
			console.log("Set Dock Calc Interval => SUCCESS " + (new Date()).toLocaleString());
		},
		error: function(request, message, object) {
			console.log("Init City Taxi Dock => ERROR : " + object + message + " " + (new Date()).toLocaleString());
		}
	});

	// 在线出租车数据点读取 -> 热力图 & Session
	function onlineTaxiHeat() {
		console.log("Online Taxi HeatMap Load...");

		$.ajax({
			type: 'get',
			url: 'http://localhost:8086/onlineTaxi',
			dataType: 'json',
			success: function(onlineTaxi) {
				if(onlineTaxi == null || onlineTaxi.length == 0) {
					console.log("Online Taxi HeatMap Load => ERROR (no data) " + (new Date()).toLocaleString());
					return;
				}

				if(taxiArr.length == 0) {
					onlineTaxi.forEach(function(taxi) {
						var pntCoord = wgs2bd(taxi.lng, taxi.lat);
						taxi.lng = pntCoord[0];
						taxi.lat = pntCoord[1];
						var taxiStr = { "lng": pntCoord[0], "lat": pntCoord[1], "count": 1 };
						taxiArr.push(taxiStr);
					});
				}
				else {
					onlineTaxi.forEach(function(taxi, i) {
						var pntCoord = wgs2bd(taxi.lng, taxi.lat);
						taxi.lng = pntCoord[0];
						taxi.lat = pntCoord[1];
						var taxiStr = { "lng": pntCoord[0], "lat": pntCoord[1], "count": 1 };
						taxiArr[i] = taxiStr;
					});
				}
				
				$.session.set('onlineTaxi', onlineTaxi);
				
				onlineTaxiMes = onlineTaxi;

				heatmapOverlay.setDataSet({
					"min": 0,
					"max": 5,
					"data": taxiArr
				});

				heatmapOverlay.draw();

				console.log("Online Taxi HeatMap Load => SUCCESS " + (new Date()).toLocaleString());
			},
			error: function(request, message, object) {
				console.log("Online Taxi HeatMap Load => ERROR : " + object + message + " " + (new Date()).toLocaleString());
			}
		});
	}

	// 城市区域分析覆盖物处理
	function cityAreaOverlays() {
		console.log("Start to add Overlay -> bmap...");
		$.ajax({
			type: 'get',
			url: 'http://localhost:8086/cityAreaCalc',
			dataType: 'json',
			success: function(areaCalcAns) {
				if(cityAreaPolygon.length == 0) {
					// bmap.clearOverlays();                         

					areaCalcAns.forEach(function(areaAns, i) {
						var color = "#78F819";

						if(areaAns.areaEva >= 110) {
							color = "#F73307";
						} else if(areaAns.areaEva <= 90) {
							color = "#0957F9";
						} else if(areaAns.areaEva > 90 && areaAns.areaEva < 110) {
							color = "#78F819";
						} else {
							console.log("Area Calc Error");
						}

						var polygon = new BMap.Polygon(cityAreaArr[i].areaCoord, {
							"fillColor": color,
							"fillOpacity": 0.2,
							"strokeColor": "#E7E7E7",
							"strokeWeight": 1.5,
							"strokeOpacity": 0.9
						});

						var infoHTML = '<div id="cityAreaEcharts" style="height: 250px; width: 420px;"></div>';

						var opts = {
							width: 400, // 宽度
							height: 250, // 高度
							title: "区域" + areaAns.areaID + ": " + areaAns.areaName // 标题
						}

						var infoWindow = new BMap.InfoWindow(infoHTML, opts); // 信息窗口
						polygon.addEventListener("click", function(event) {
							bmap.openInfoWindow(infoWindow, event.point);

							// 初始化 Echarts 图表
							var myChart = echarts.init(document.getElementById("cityAreaEcharts"));
							myChart.showLoading();

							$.ajax({
								type: 'get',
								url: 'http://localhost:8086/areaClacAns',
								data: {
									areaID: areaAns.areaID,
									interval: 24
								},
								dataType: 'json',
								success: function(areaClacAns) {
									var data = [];

									areaClacAns.sort(function(a, b) {
										return a.calcTime > b.calcTime ? 1 : -1;
									});

									areaClacAns.forEach(function(areaAnsN, i) {
										var date = new Date(areaAnsN.calcTime);
										data.push({
											name: date.toString(),
											value: [date, areaAnsN.taxiNum]
										});
									});

									myChart.hideLoading();
									myChart.setOption({
										title: {
											text: '24小时区域出租车数量变化'
										},
										tooltip: {
											trigger: 'axis',
											formatter: function(params) {
												params = params[0];
												var date = new Date(params.name);
												return date.toLocaleString() + ' 出租车数量: ' + params.value[1];
											},
											axisPointer: {
												animation: false
											}
										},
										xAxis: {
											type: 'time',
											splitLine: {
												show: false
											}
										},
										yAxis: {
											boundaryGap: [0, '100%'],
											type: 'value',
											splitLine: {
												show: false
											}
										},
										series: [{
											name: 'taxiAreaNum',
											type: 'line',
											showSymbol: false,
											hoverAnimation: false,
											data: data
										}]
									});

									console.log("Area Msgbox Data Opt => SUCCESS " + (new Date()).toString());
								},
								error: function(request, message, object) {
									console.log("Area Msgbox Data Opt => ERROR : " + object + message + " " + (new Date()).toLocaleString());
								}
							});

						});
						// 添加覆盖物
						bmap.addOverlay(polygon);
						cityAreaPolygon.push({ polygon: polygon, mes: areaAns });

					});
					console.log("Polygon Overlay Add => SUCCESS " + (new Date()).toLocaleString());
				} else {
					cityAreaPolygon.forEach(function(cityArea, i) {
						var color = '#78F819';

						if(areaCalcAns[i].areaEva >= 110) {
							color = "#F73307";
						} else if(areaCalcAns[i].areaEva <= 90) {
							color = "#0957F9";
						} else if(areaCalcAns[i].areaEva > 90 && areaCalcAns[i].areaEva < 110) {
							color = "#78F819";
						} else {
							console.log("Area Calc Error");
						}
						cityArea.Mes = areaCalcAns[i]
						cityArea.polygon.setFillColor(color);

						cityArea.draw();
					});
					console.log("Polygon Overlay Update => SUCCESS " + (new Date()).toLocaleString());
				}
			},
			error: function(request, message, object) {
				console.log("Polygon Overlay Add => ERROR : " + object + message + " " + (new Date()).toLocaleString());
			}
		});
	}

	// 城市出租车停靠点覆盖物处理
	function cityDockOverlays() {
		console.log("Start to add Dock Overlay -> bmap...");
		$.ajax({
			type: 'get',
			url: 'http://localhost:8086/cityDockCalc',
			dataType: 'json',
			success: function(dockCalcAns) {
				if(taxiDockCircle.length == 0) {
					// bmap.clearOverlays();

					dockCalcAns.forEach(function(dockAns, i) {
						var color = "#ffbf00";
						
						dockAns.dockEva = parseInt(dockAns.dockEva);

						if(dockAns.dockEva >= 110) {
							color = "#ff2d00";
						} else if(dockAns.dockEva <= 90) {
							color = "#47ff00";
						} else if(dockAns.dcokEva > 90 && dcokAns.dockEva < 110) {
							color = "#ffbf00";
						}

						// 服务区域大小: 800米
						var circle = new BMap.Circle(taxiDockArr[dockAns.dockID-1].dockPnt, 800, {
							"fillColor": color,
							"fillOpacity": 0.8,
							"strokeColor": "#adadad",
							"strokeWeight": 0.8,
							"strokeOpacity": 0.9
						});

						// 添加覆盖物
						bmap.addOverlay(circle);
						circle.hide();
						
						taxiDockCircle.push({ circle: circle, mes: dockAns });
					});
					console.log("Taxi Dock Overlay Add => SUCCESS " + (new Date()).toLocaleString());

				} else {
					taxiDockCircle.forEach(function(taxiDock, i) {
						var color = "#ffbf00";

						if(dockAns.dockEva >= 110) {
							color = "#ff2d00";
						} else if(dockAns.dockEva <= 90) {
							color = "#47ff00";
						} else if(dockAns.dcokEva > 90 && dcokAns.dockEva < 110) {
							color = "#ffbf00";
						} else {
							console.log("Dock Calc Error");
						}

						taxiDock.Mes = dockAns;
						taxiDock.circle.setFillColor(color);

						taxiDock.draw();
					});
					console.log("Taxi Dock Overlay Update => SUCCESS " + (new Date()).toLocaleString());
				}
			},
			error: function(request, message, object) {
				console.log("Taxi Dock Overlay Opt => ERROR : " + object + message + " " + (new Date()).toLocaleString());
			}
		});
	}

	// 地图覆盖物显示与隐藏

	var heatFlag = 0;
	onHeatmapClick = function() {
		if(heatFlag == 0) {
			heatmapOverlay.show();
			console.log("Heatmap Overlay Show");
			heatFlag = 1;
		} else {
			heatmapOverlay.hide();
			console.log("Heatmap Overlay Hide");
			heatFlag = 0;
		}
	}

	var polFlag = 1;
	onPolygonClick = function() {

		if(cityAreaPolygon.length == 0) return;
		if(polFlag == 0) {
			cityAreaPolygon.forEach(function(cityArea, i) {
				cityArea.polygon.show();
			});
			console.log("CityArea Polygon Show");
			polFlag = 1;
		} else {
			cityAreaPolygon.forEach(function(cityArea, i) {
				cityArea.polygon.hide();
			});
			console.log("CityArea Polygon Hide");
			polFlag = 0;
		}

	}

	var dockFlag = 0;
	onDockpntClick = function() {
		if(taxiDockCircle.length == 0) return;
		if(dockFlag == 0) {
			taxiDockCircle.forEach(function(taxiDock,i){
				taxiDock.circle.show();
			});
			console.log("Dock Point Area Show");
			dockFlag = 1;
		} else {
			taxiDockCircle.forEach(function(taxiDock,i){
				taxiDock.circle.hide();
			});
			console.log("Dock Point Area Hide");
			dockFlag = 0;
		}
	}
}